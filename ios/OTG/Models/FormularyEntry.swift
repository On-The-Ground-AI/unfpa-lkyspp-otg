import Foundation
import CoreData

/// FormularyEntry represents a drug/medication entry in the clinical formulary
/// Mirrors the Android FormularyEntry entity
@NSManaged public class FormularyEntryEntity: NSManagedObject, Identifiable {
    @NSManaged public var drug: String  // lowercase generic name, e.g. "oxytocin"
    @NSManaged public var genericName: String
    @NSManaged public var localNamesJson: String  // JSON object: {"my": "…", "id": "…"}
    @NSManaged public var indication: String
    @NSManaged public var dose: String
    @NSManaged public var route: String  // IM | IV | oral | sublingual | rectal
    @NSManaged public var timing: String
    @NSManaged public var alternativeDose: String?
    @NSManaged public var contraindicationsJson: String  // JSON array of strings
    @NSManaged public var warningsJson: String  // JSON array of strings
    @NSManaged public var source: String  // "WHO PCPNC 2023, Section 3.2, Page 47"
    @NSManaged public var sourceChunkId: String
    @NSManaged public var sourceUrl: String
    @NSManaged public var whoEmlListed: Bool
    @NSManaged public var clinicalStatus: String  // "VERIFIED" | "UNVERIFIED-SCAFFOLD"
    @NSManaged public var reviewedBy: String?
    @NSManaged public var reviewedAt: String?  // ISO-8601
    @NSManaged public var expiryDate: String?  // ISO-8601

    public var id: String { drug }
}

/// View model for FormularyEntry suitable for SwiftUI
public struct FormularyEntry: Identifiable, Codable {
    public let id: String
    public let drug: String
    public let genericName: String
    public let localNames: [String: String]
    public let indication: String
    public let dose: String
    public let route: String
    public let timing: String
    public let alternativeDose: String?
    public let contraindications: [String]
    public let warnings: [String]
    public let source: String
    public let sourceChunkId: String
    public let sourceUrl: String
    public let whoEmlListed: Bool
    public let clinicalStatus: String
    public let reviewedBy: String?
    public let reviewedAt: String?
    public let expiryDate: String?

    public init(
        drug: String,
        genericName: String,
        localNames: [String: String],
        indication: String,
        dose: String,
        route: String,
        timing: String,
        alternativeDose: String? = nil,
        contraindications: [String] = [],
        warnings: [String] = [],
        source: String,
        sourceChunkId: String,
        sourceUrl: String,
        whoEmlListed: Bool = false,
        clinicalStatus: String = "UNVERIFIED-SCAFFOLD",
        reviewedBy: String? = nil,
        reviewedAt: String? = nil,
        expiryDate: String? = nil
    ) {
        self.id = drug
        self.drug = drug
        self.genericName = genericName
        self.localNames = localNames
        self.indication = indication
        self.dose = dose
        self.route = route
        self.timing = timing
        self.alternativeDose = alternativeDose
        self.contraindications = contraindications
        self.warnings = warnings
        self.source = source
        self.sourceChunkId = sourceChunkId
        self.sourceUrl = sourceUrl
        self.whoEmlListed = whoEmlListed
        self.clinicalStatus = clinicalStatus
        self.reviewedBy = reviewedBy
        self.reviewedAt = reviewedAt
        self.expiryDate = expiryDate
    }

    /// Get JSON representation of local names
    public func localNamesJson() -> String? {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(localNames),
              let json = String(data: data, encoding: .utf8) else {
            return nil
        }
        return json
    }

    /// Parse local names from JSON
    public static func parseLocalNames(_ json: String) -> [String: String] {
        let decoder = JSONDecoder()
        guard let data = json.data(using: .utf8),
              let names = try? decoder.decode([String: String].self, from: data) else {
            return [:]
        }
        return names
    }

    /// Check if drug has expired
    public var isExpired: Bool {
        guard let expiryStr = expiryDate else { return false }
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiryStr) else { return false }
        return Date() > expiry
    }

    /// Check clinical status
    public var isVerified: Bool {
        clinicalStatus == "VERIFIED"
    }

    /// Get display name (generic name or first local name)
    public var displayName: String {
        genericName
    }

    /// Get local name for language
    public func localName(for language: String) -> String? {
        localNames[language]
    }
}

/// Dosing calculation helper
public struct DoseCalculation {
    public let drug: String
    public let baseDose: Double
    public let unit: String
    public let patientWeight: Double?
    public let patientAge: Double?
    public let route: String

    public var calculatedDose: Double {
        baseDose
    }

    public var doseText: String {
        "\(calculatedDose) \(unit)"
    }
}
