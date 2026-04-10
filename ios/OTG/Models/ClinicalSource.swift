import Foundation
import CoreData

/// ClinicalSource represents the origin of clinical knowledge
/// Tracks citations, source verification, and expiry
@NSManaged public class ClinicalSourceEntity: NSManagedObject, Identifiable {
    @NSManaged public var sourceId: String
    @NSManaged public var sourceDocument: String  // e.g. "WHO PCPNC 2023"
    @NSManaged public var sourceEdition: String   // e.g. "2023-03-12"
    @NSManaged public var sourceUrl: String
    @NSManaged public var organization: String    // "WHO", "MOH", "UNFPA"
    @NSManaged public var language: String        // BCP-47
    @NSManaged public var expiryDate: String?     // ISO-8601
    @NSManaged public var verifiedAt: String?     // ISO-8601
    @NSManaged public var verifiedBy: String?
    @NSManaged public var ingestedAt: Int64       // epoch millis

    public var id: String { sourceId }
}

/// View model for ClinicalSource
public struct ClinicalSource: Identifiable, Codable {
    public let id: String
    public let sourceId: String
    public let sourceDocument: String
    public let sourceEdition: String
    public let sourceUrl: String
    public let organization: String
    public let language: String
    public let expiryDate: String?
    public let verifiedAt: String?
    public let verifiedBy: String?
    public let ingestedAt: Int64

    public init(
        sourceId: String,
        sourceDocument: String,
        sourceEdition: String,
        sourceUrl: String,
        organization: String,
        language: String = "en",
        expiryDate: String? = nil,
        verifiedAt: String? = nil,
        verifiedBy: String? = nil,
        ingestedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.id = sourceId
        self.sourceId = sourceId
        self.sourceDocument = sourceDocument
        self.sourceEdition = sourceEdition
        self.sourceUrl = sourceUrl
        self.organization = organization
        self.language = language
        self.expiryDate = expiryDate
        self.verifiedAt = verifiedAt
        self.verifiedBy = verifiedBy
        self.ingestedAt = ingestedAt
    }

    /// Check if source has expired
    public var isExpired: Bool {
        guard let expiryStr = expiryDate else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiryStr) else { return false }
        return Date() > expiry
    }

    /// Check if source has been verified
    public var isVerified: Bool {
        verifiedAt != nil && verifiedBy != nil
    }

    /// Display string for source
    public var displayString: String {
        var result = sourceDocument
        if !sourceEdition.isEmpty {
            result += " (\(sourceEdition))"
        }
        return result
    }
}

/// Citation represents a reference to a source
public struct Citation: Identifiable, Codable {
    public let id: String
    public let chunkId: String
    public let sourceDocument: String
    public let sourceEdition: String
    public let sourceSection: String
    public let sourcePage: Int
    public let sourceUrl: String
    public let verbatimExcerpt: String
    public let organization: String

    public init(
        chunkId: String,
        sourceDocument: String,
        sourceEdition: String,
        sourceSection: String,
        sourcePage: Int,
        sourceUrl: String,
        verbatimExcerpt: String,
        organization: String = "WHO"
    ) {
        self.id = UUID().uuidString
        self.chunkId = chunkId
        self.sourceDocument = sourceDocument
        self.sourceEdition = sourceEdition
        self.sourceSection = sourceSection
        self.sourcePage = sourcePage
        self.sourceUrl = sourceUrl
        self.verbatimExcerpt = verbatimExcerpt
        self.organization = organization
    }

    /// Display string for citation
    public var displayString: String {
        "\(sourceDocument), \(sourceSection), page \(sourcePage)"
    }

    /// Full APA-style citation
    public var apaCitation: String {
        "\(sourceDocument) (\(sourceEdition)). \(sourceSection). Retrieved from \(sourceUrl)"
    }
}
