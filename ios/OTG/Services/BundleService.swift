import Foundation

/// BundleService manages downloading and verifying content bundles
/// Supports background downloads and signature verification
public class BundleService: ObservableObject {
    @Published var downloadProgress: Double = 0
    @Published var isDownloading = false
    @Published var lastError: Error?

    private let database: OTGDatabase
    private let verifier: SignatureVerifier
    private let urlSession: URLSession

    public init(database: OTGDatabase = .shared) {
        self.database = database
        self.verifier = SignatureVerifier()

        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 3600  // 1 hour for large downloads
        self.urlSession = URLSession(configuration: config)
    }

    /// Download and verify a content bundle
    public func downloadBundle(from url: URL, signature: String) async throws {
        DispatchQueue.main.async { self.isDownloading = true }
        defer { DispatchQueue.main.async { self.isDownloading = false } }

        do {
            let (data, _) = try await urlSession.data(from: url)

            // Verify signature
            guard try await verifier.verify(data: data, signature: signature) else {
                throw BundleError.invalidSignature
            }

            // Extract and store bundle
            try await processBundleData(data)
        } catch {
            DispatchQueue.main.async { self.lastError = error }
            throw error
        }
    }

    /// Fetch latest bundle manifest from server
    public func fetchLatestManifest() async throws -> BundleManifest {
        let url = URL(string: "https://api.example.com/bundles/latest")!
        let (data, _) = try await urlSession.data(from: url)

        let manifest = try JSONDecoder().decode(BundleManifest.self, from: data)
        return manifest
    }

    /// Check if a bundle update is available
    public func checkForUpdates() async throws -> Bool {
        let manifest = try await fetchLatestManifest()
        let currentHash = UserDefaults.standard.string(forKey: "bundleContentHash") ?? ""
        return manifest.contentHash != currentHash
    }

    // MARK: - Private

    private func processBundleData(_ data: Data) async throws {
        // TODO: Extract and process bundle contents
        // This would include:
        // 1. Decompressing bundle data
        // 2. Extracting knowledge chunks
        // 3. Loading embeddings
        // 4. Updating database

        // For now, just save the hash
        let hash = computeSHA256(data)
        UserDefaults.standard.set(hash, forKey: "bundleContentHash")
    }

    private func computeSHA256(_ data: Data) -> String {
        var digest = [UInt8](repeating: 0, count: 32)
        data.withUnsafeBytes { buffer in
            var context = CC_SHA256_CTX()
            CC_SHA256_Init(&context)
            CC_SHA256_Update(&context, buffer.baseAddress, CC_LONG(data.count))
            CC_SHA256_Final(&digest, &context)
        }
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Types

public struct BundleManifest: Codable {
    public let version: String
    public let contentHash: String
    public let docs: [DocEntry]
    public let signature: String

    public struct DocEntry: Codable {
        public let slug: String
        public let sha256: String
        public let url: URL
        public let vertical: String
        public let title: String
    }
}

public enum BundleError: LocalizedError {
    case invalidSignature
    case downloadFailed(Error)
    case processingFailed(Error)
    case invalidManifest

    public var errorDescription: String? {
        switch self {
        case .invalidSignature:
            return "Bundle signature verification failed"
        case .downloadFailed(let error):
            return "Bundle download failed: \(error.localizedDescription)"
        case .processingFailed(let error):
            return "Bundle processing failed: \(error.localizedDescription)"
        case .invalidManifest:
            return "Invalid bundle manifest"
        }
    }
}

// MARK: - Signature Verification

public class SignatureVerifier {
    private let publicKey: SecKey?

    public init() {
        // Load public key from bundle
        if let keyPath = Bundle.main.path(forResource: "manifest_public", ofType: "pem") {
            let keyData = try? Data(contentsOf: URL(fileURLWithPath: keyPath))
            self.publicKey = keyData.flatMap { Self.loadPublicKey($0) }
        } else {
            self.publicKey = nil
        }
    }

    /// Verify Ed25519 signature
    public func verify(data: Data, signature: String) async throws -> Bool {
        guard let publicKey = publicKey else {
            throw BundleError.invalidSignature
        }

        guard let signatureData = Data(base64Encoded: signature) else {
            throw BundleError.invalidSignature
        }

        var error: Unmanaged<CFError>?
        let isValid = SecKeyVerifySignature(
            publicKey,
            .ed25519,
            data as CFData,
            signatureData as CFData,
            &error
        )

        if let error = error?.takeRetainedValue() {
            throw BundleError.invalidSignature
        }

        return isValid
    }

    private static func loadPublicKey(_ pemData: Data) -> SecKey? {
        guard let pemString = String(data: pemData, encoding: .utf8) else {
            return nil
        }

        let base64 = pemString
            .replacingOccurrences(of: "-----BEGIN PUBLIC KEY-----", with: "")
            .replacingOccurrences(of: "-----END PUBLIC KEY-----", with: "")
            .replacingOccurrences(of: "\n", with: "")
            .trimmingCharacters(in: .whitespaces)

        guard let keyData = Data(base64Encoded: base64) else {
            return nil
        }

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeEC,
            kSecAttrKeyClass as String: kSecAttrKeyClassPublic,
        ]

        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateWithData(keyData as CFData, attributes as CFDictionary, &error) else {
            return nil
        }

        return key
    }
}

// SHA256 helper (requires CommonCrypto or CryptoKit)
import CommonCrypto

extension Data {
    func sha256() -> String {
        var digest = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        self.withUnsafeBytes { buffer in
            var context = CC_SHA256_CTX()
            CC_SHA256_Init(&context)
            CC_SHA256_Update(&context, buffer.baseAddress, CC_LONG(self.count))
            CC_SHA256_Final(&digest, &context)
        }
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
