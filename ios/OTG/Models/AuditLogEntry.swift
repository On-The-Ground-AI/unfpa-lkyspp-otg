import Foundation
import CoreData

/// AuditLogEntry represents a logged clinical query for audit and research
@NSManaged public class AuditLogEntity: NSManagedObject {
    @NSManaged public var answeredAt: Int64
    @NSManaged public var chunkIds: String    // JSON array of chunk IDs
    @NSManaged public var clinicalContext: String?
    @NSManaged public var language: String
    @NSManaged public var mode: String        // "chat" | "formulary" | "protocol"
    @NSManaged public var query: String
    @NSManaged public var response: String
    @NSManaged public var userId: String?
}

/// View model for AuditLogEntry
public struct AuditLogEntry: Identifiable, Codable {
    public let id: String
    public let answeredAt: Int64
    public let chunkIds: [String]
    public let clinicalContext: String?
    public let language: String
    public let mode: String
    public let query: String
    public let response: String
    public let userId: String?

    public init(
        answeredAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        chunkIds: [String],
        clinicalContext: String? = nil,
        language: String = "en",
        mode: String,
        query: String,
        response: String,
        userId: String? = nil
    ) {
        self.id = UUID().uuidString
        self.answeredAt = answeredAt
        self.chunkIds = chunkIds
        self.clinicalContext = clinicalContext
        self.language = language
        self.mode = mode
        self.query = query
        self.response = response
        self.userId = userId
    }

    /// Convert chunk IDs to JSON string
    public func chunkIdsJson() -> String {
        guard let data = try? JSONEncoder().encode(chunkIds),
              let json = String(data: data, encoding: .utf8) else {
            return "[]"
        }
        return json
    }

    /// Parse chunk IDs from JSON
    public static func parseChunkIds(_ json: String) -> [String] {
        guard let data = json.data(using: .utf8),
              let ids = try? JSONDecoder().decode([String].self, from: data) else {
            return []
        }
        return ids
    }

    /// Get timestamp as Date
    public var timestamp: Date {
        Date(timeIntervalSince1970: Double(answeredAt) / 1000.0)
    }

    /// Get formatted time string
    public var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}

/// AuditLogService manages logging of clinical queries
public class AuditLogService: ObservableObject {
    private let database: OTGDatabase

    public init(database: OTGDatabase = .shared) {
        self.database = database
    }

    /// Log a clinical query
    public func logQuery(
        mode: String,
        query: String,
        response: String,
        chunkIds: [String],
        clinicalContext: String? = nil,
        language: String = "en",
        userId: String? = nil
    ) {
        let entry = AuditLogEntry(
            chunkIds: chunkIds,
            clinicalContext: clinicalContext,
            language: language,
            mode: mode,
            query: query,
            response: response,
            userId: userId
        )

        // Save to database via managed object
        let entity = NSEntityDescription.insertNewObject(
            forEntityName: "AuditLogEntity",
            into: database.viewContext
        ) as! AuditLogEntity

        entity.answeredAt = entry.answeredAt
        entity.chunkIds = entry.chunkIdsJson()
        entity.clinicalContext = entry.clinicalContext
        entity.language = entry.language
        entity.mode = entry.mode
        entity.query = entry.query
        entity.response = entry.response
        entity.userId = entry.userId

        database.save()
    }

    /// Get recent audit logs
    public func getRecentLogs(limit: Int = 100) -> [AuditLogEntry] {
        let fetch = NSFetchRequest<AuditLogEntity>(entityName: "AuditLogEntity")
        fetch.sortDescriptors = [NSSortDescriptor(key: "answeredAt", ascending: false)]
        fetch.fetchLimit = limit

        do {
            let entities = try database.viewContext.fetch(fetch)
            return entities.map { entity in
                AuditLogEntry(
                    answeredAt: entity.answeredAt,
                    chunkIds: AuditLogEntry.parseChunkIds(entity.chunkIds),
                    clinicalContext: entity.clinicalContext,
                    language: entity.language,
                    mode: entity.mode,
                    query: entity.query,
                    response: entity.response,
                    userId: entity.userId
                )
            }
        } catch {
            print("Error fetching audit logs: \(error)")
            return []
        }
    }

    /// Delete old audit logs
    public func deleteOlderThan(days: Int) {
        let timeInterval = TimeInterval(days * 24 * 60 * 60)
        let beforeDate = Date(timeIntervalSinceNow: -timeInterval)
        let beforeMillis = Int64(beforeDate.timeIntervalSince1970 * 1000)

        let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: "AuditLogEntity")
        fetch.predicate = NSPredicate(format: "answeredAt < %lld", beforeMillis)

        let request = NSBatchDeleteRequest(fetchRequest: fetch)
        do {
            try database.viewContext.execute(request)
            database.save()
        } catch {
            print("Error deleting old logs: \(error)")
        }
    }

    /// Get statistics about logged queries
    public func getStatistics() -> AuditStatistics {
        let fetch = NSFetchRequest<AuditLogEntity>(entityName: "AuditLogEntity")
        let allLogs = (try? database.viewContext.fetch(fetch)) ?? []

        let modeCount = Dictionary(grouping: allLogs, by: { $0.mode })
            .mapValues { $0.count }

        let languageCount = Dictionary(grouping: allLogs, by: { $0.language })
            .mapValues { $0.count }

        return AuditStatistics(
            totalQueries: allLogs.count,
            byMode: modeCount,
            byLanguage: languageCount,
            dateRange: (
                start: allLogs.min(by: { $0.answeredAt < $1.answeredAt })?.answeredAt,
                end: allLogs.max(by: { $0.answeredAt < $1.answeredAt })?.answeredAt
            )
        )
    }
}

/// Audit statistics
public struct AuditStatistics {
    public let totalQueries: Int
    public let byMode: [String: Int]
    public let byLanguage: [String: Int]
    public let dateRange: (start: Int64?, end: Int64?)
}
