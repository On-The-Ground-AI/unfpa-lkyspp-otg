import Foundation
import CoreData

/// KnowledgeDoc represents a document in the knowledge base
/// Mirrors the Android KnowledgeDoc entity
@NSManaged public class KnowledgeDocEntity: NSManagedObject, Identifiable {
    @NSManaged public var slug: String
    @NSManaged public var title: String
    @NSManaged public var vertical: String  // e.g., "MOH_MMR", "WHO_PCPNC"
    @NSManaged public var contentHash: String  // SHA-256
    @NSManaged public var expiryDate: String?  // ISO-8601
    @NSManaged public var sourceUrl: String?
    @NSManaged public var language: String     // BCP-47
    @NSManaged public var ingestedAt: Int64    // epoch millis

    @NSManaged public var chunks: NSSet  // relationship to KnowledgeChunkEntity

    public var id: String { slug }
}

/// View model for KnowledgeDoc suitable for SwiftUI
public struct KnowledgeDoc: Identifiable, Codable {
    public let id: String
    public let slug: String
    public let title: String
    public let vertical: String
    public let contentHash: String
    public let expiryDate: String?
    public let sourceUrl: String?
    public let language: String
    public let ingestedAt: Int64

    public init(
        slug: String,
        title: String,
        vertical: String,
        contentHash: String,
        expiryDate: String? = nil,
        sourceUrl: String? = nil,
        language: String = "en",
        ingestedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = slug
        self.slug = slug
        self.title = title
        self.vertical = vertical
        self.contentHash = contentHash
        self.expiryDate = expiryDate
        self.sourceUrl = sourceUrl
        self.language = language
        self.ingestedAt = ingestedAt
    }

    /// Check if document has expired
    public var isExpired: Bool {
        guard let expiryStr = expiryDate else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiryStr) else { return false }
        return Date() > expiry
    }
}
