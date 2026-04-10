import Foundation
import CoreData

/// KnowledgeChunk represents a single semantic chunk of clinical knowledge
/// Mirrors the Android KnowledgeChunk entity
@NSManaged public class KnowledgeChunkEntity: NSManagedObject, Identifiable {
    @NSManaged public var chunkId: String
    @NSManaged public var docSlug: String
    @NSManaged public var chunkIndex: Int32
    @NSManaged public var content: String
    @NSManaged public var contentHash: String
    @NSManaged public var embedding: Data  // Float32LE, 384 dims × 4 bytes = 1536 bytes

    // Citation metadata
    @NSManaged public var sourceDocument: String
    @NSManaged public var sourceEdition: String
    @NSManaged public var sourceSection: String
    @NSManaged public var sourcePage: Int32
    @NSManaged public var sourceUrl: String
    @NSManaged public var verbatimExcerpt: String

    @NSManaged public var expiryDate: String?  // ISO-8601; null = no expiry
    @NSManaged public var language: String     // BCP-47
    @NSManaged public var ingestedAt: Int64    // epoch millis

    @NSManaged public var document: KnowledgeDocEntity?

    public var id: String { chunkId }
}

/// View model for KnowledgeChunk suitable for SwiftUI
public struct KnowledgeChunk: Identifiable, Codable {
    public let id: String
    public let chunkId: String
    public let docSlug: String
    public let chunkIndex: Int
    public let content: String
    public let contentHash: String
    public let embedding: [Float]  // 384-dimensional

    // Citation metadata
    public let sourceDocument: String
    public let sourceEdition: String
    public let sourceSection: String
    public let sourcePage: Int
    public let sourceUrl: String
    public let verbatimExcerpt: String

    public let expiryDate: String?
    public let language: String
    public let ingestedAt: Int64

    public init(
        chunkId: String,
        docSlug: String,
        chunkIndex: Int,
        content: String,
        contentHash: String,
        embedding: [Float],
        sourceDocument: String,
        sourceEdition: String,
        sourceSection: String,
        sourcePage: Int,
        sourceUrl: String,
        verbatimExcerpt: String,
        expiryDate: String? = nil,
        language: String = "en",
        ingestedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = chunkId
        self.chunkId = chunkId
        self.docSlug = docSlug
        self.chunkIndex = chunkIndex
        self.content = content
        self.contentHash = contentHash
        self.embedding = embedding
        self.sourceDocument = sourceDocument
        self.sourceEdition = sourceEdition
        self.sourceSection = sourceSection
        self.sourcePage = sourcePage
        self.sourceUrl = sourceUrl
        self.verbatimExcerpt = verbatimExcerpt
        self.expiryDate = expiryDate
        self.language = language
        self.ingestedAt = ingestedAt
    }

    /// Convert embedding bytes to Float array
    public static func bytesToFloats(_ data: Data) -> [Float] {
        var floats: [Float] = []
        data.withUnsafeBytes { buffer in
            let floatBuffer = buffer.bindMemory(to: Float.self)
            floats = Array(floatBuffer)
        }
        return floats
    }

    /// Convert Float array to bytes
    public static func floatsToBytes(_ floats: [Float]) -> Data {
        return Data(bytes: floats, count: floats.count * MemoryLayout<Float>.stride)
    }

    /// Check if chunk has expired
    public var isExpired: Bool {
        guard let expiryStr = expiryDate else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiryStr) else { return false }
        return Date() > expiry
    }
}

/// Search result from knowledge base
public struct KnowledgeSearchResult: Identifiable {
    public let id: String
    public let chunkId: String
    public let documentTitle: String
    public let docSlug: String
    public let content: String
    public let sourcePage: Int
    public let sourceSection: String
    public let sourceDocument: String
    public let sourceUrl: String
    public let verbatimExcerpt: String
    public let expiryDate: String?
    public let score: Float

    public init(
        chunkId: String,
        documentTitle: String,
        docSlug: String,
        content: String,
        sourcePage: Int,
        sourceSection: String,
        sourceDocument: String,
        sourceUrl: String,
        verbatimExcerpt: String,
        expiryDate: String? = nil,
        score: Float
    ) {
        self.id = chunkId
        self.chunkId = chunkId
        self.documentTitle = documentTitle
        self.docSlug = docSlug
        self.content = content
        self.sourcePage = sourcePage
        self.sourceSection = sourceSection
        self.sourceDocument = sourceDocument
        self.sourceUrl = sourceUrl
        self.verbatimExcerpt = verbatimExcerpt
        self.expiryDate = expiryDate
        self.score = score
    }
}
