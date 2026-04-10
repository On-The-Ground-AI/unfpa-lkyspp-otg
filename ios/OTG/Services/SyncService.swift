import Foundation
import BackgroundTasks

/// SyncService handles background synchronization of content with server
/// Manages incremental updates and background sync scheduling
public class SyncService: ObservableObject {
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    @Published var syncProgress: Double = 0
    @Published var lastError: Error?

    private let database: OTGDatabase
    private let bundleService: BundleService
    private let urlSession: URLSession

    public init(database: OTGDatabase = .shared) {
        self.database = database
        self.bundleService = BundleService(database: database)

        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        self.urlSession = URLSession(configuration: config)
    }

    /// Schedule periodic sync task
    public func schedulePeriodicSync() {
        let request = BGProcessingTaskRequest(identifier: "org.unfpa.otg.sync")
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
            print("Background sync scheduled")
        } catch {
            print("Error scheduling background sync: \(error)")
        }
    }

    /// Perform sync operation
    public func sync() async {
        DispatchQueue.main.async { self.isSyncing = true }
        defer { DispatchQueue.main.async { self.isSyncing = false } }

        do {
            let manifest = try await bundleService.fetchLatestManifest()

            // Verify signature
            guard try await verifyManifest(manifest) else {
                throw SyncError.invalidManifestSignature
            }

            // Download and apply updates
            for doc in manifest.docs {
                try await downloadAndApplyDocument(doc)
            }

            DispatchQueue.main.async {
                self.lastSyncDate = Date()
            }
        } catch {
            DispatchQueue.main.async {
                self.lastError = error
            }
            print("Sync error: \(error)")
        }
    }

    /// Force sync immediately
    public func syncNow() async {
        await sync()
    }

    /// Check if sync is needed
    public func isSyncNeeded() async -> Bool {
        // Sync every 12 hours
        let lastSync = UserDefaults.standard.object(forKey: "lastSyncDate") as? Date ?? Date.distantPast
        let interval = Date().timeIntervalSince(lastSync)
        return interval > 12 * 60 * 60
    }

    // MARK: - Private

    private func verifyManifest(_ manifest: BundleManifest) async throws -> Bool {
        // Verify Ed25519 signature
        let manifestJson = try JSONEncoder().encode(manifest)
        let verifier = SignatureVerifier()
        return try await verifier.verify(data: manifestJson, signature: manifest.signature)
    }

    private func downloadAndApplyDocument(_ doc: BundleManifest.DocEntry) async throws {
        let (data, _) = try await urlSession.data(from: doc.url)

        // Verify SHA256
        let computedHash = data.sha256()
        guard computedHash == doc.sha256 else {
            throw SyncError.checksumMismatch(doc.slug)
        }

        // Check if already exists with same hash
        if let existing = database.fetchDocument(by: doc.slug),
           existing.contentHash == doc.sha256 {
            print("Document \(doc.slug) already up to date")
            return
        }

        // Delete old chunks for this document
        database.deleteChunks(for: doc.slug)

        // Parse and insert new document
        let knowledgeDoc = KnowledgeDoc(
            slug: doc.slug,
            title: doc.title,
            vertical: doc.vertical,
            contentHash: doc.sha256,
            sourceUrl: doc.url.absoluteString,
            language: "en",
            ingestedAt: Int64(Date().timeIntervalSince1970 * 1000)
        )
        database.upsertDocument(knowledgeDoc)

        print("Updated document: \(doc.slug)")
    }
}

// MARK: - Background Task Handling

public class SyncTaskHandler {
    public static func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: "org.unfpa.otg.sync", using: nil) { task in
            handleSyncTask(task as! BGProcessingTask)
        }
    }

    private static func handleSyncTask(_ task: BGProcessingTask) {
        let syncService = SyncService()

        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1

        queue.addOperation {
            Task {
                await syncService.sync()
            }
        }

        task.expirationHandler = {
            queue.cancelAllOperations()
        }

        // Schedule next sync
        syncService.schedulePeriodicSync()
    }
}

// MARK: - Types

public enum SyncError: LocalizedError {
    case invalidManifestSignature
    case checksumMismatch(String)
    case downloadFailed(Error)
    case parsingFailed(Error)

    public var errorDescription: String? {
        switch self {
        case .invalidManifestSignature:
            return "Sync manifest signature verification failed"
        case .checksumMismatch(let slug):
            return "Checksum mismatch for document: \(slug)"
        case .downloadFailed(let error):
            return "Download failed: \(error.localizedDescription)"
        case .parsingFailed(let error):
            return "Parsing failed: \(error.localizedDescription)"
        }
    }
}
