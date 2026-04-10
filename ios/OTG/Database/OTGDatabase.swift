import CoreData
import Foundation

/// OTGDatabase manages Core Data persistence
/// Uses SQLite backend with offline-first principles
public class OTGDatabase: ObservableObject {
    static let shared = OTGDatabase()

    let container: NSPersistentContainer
    let viewContext: NSManagedObjectContext

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "OTG")

        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }

        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }

        viewContext = container.viewContext
        viewContext.automaticallyMergesChangesFromParent = true
        viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    /// Save changes to persistent store
    public func save() {
        let context = viewContext
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                let nsError = error as NSError
                fatalError("Unresolved error \(nsError), \(nsError.userInfo)")
            }
        }
    }

    /// Delete all data from database
    public func deleteAll() {
        let entities = [
            "KnowledgeChunkEntity",
            "KnowledgeDocEntity",
            "FormularyEntryEntity",
            "ClinicalSourceEntity",
            "AuditLogEntity"
        ]

        for entity in entities {
            let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: entity)
            let delete = NSBatchDeleteRequest(fetchRequest: fetch)
            do {
                try viewContext.execute(delete)
                try viewContext.save()
            } catch {
                print("Error deleting \(entity): \(error)")
            }
        }
    }

    /// Get document count
    public func getDocumentCount() -> Int {
        let fetch = NSFetchRequest<KnowledgeDocEntity>(entityName: "KnowledgeDocEntity")
        do {
            return try viewContext.count(for: fetch)
        } catch {
            return 0
        }
    }

    /// Get chunk count
    public func getChunkCount() -> Int {
        let fetch = NSFetchRequest<KnowledgeChunkEntity>(entityName: "KnowledgeChunkEntity")
        do {
            return try viewContext.count(for: fetch)
        } catch {
            return 0
        }
    }

    /// Get formulary entry count
    public func getFormularyCount() -> Int {
        let fetch = NSFetchRequest<FormularyEntryEntity>(entityName: "FormularyEntryEntity")
        do {
            return try viewContext.count(for: fetch)
        } catch {
            return 0
        }
    }
}

// MARK: - Knowledge Document Operations

extension OTGDatabase {
    /// Fetch document by slug
    public func fetchDocument(by slug: String) -> KnowledgeDocEntity? {
        let fetch = NSFetchRequest<KnowledgeDocEntity>(entityName: "KnowledgeDocEntity")
        fetch.predicate = NSPredicate(format: "slug == %@", slug)
        fetch.fetchLimit = 1

        do {
            return try viewContext.fetch(fetch).first
        } catch {
            print("Error fetching document: \(error)")
            return nil
        }
    }

    /// Fetch documents by vertical
    public func fetchDocuments(by vertical: String) -> [KnowledgeDocEntity] {
        let fetch = NSFetchRequest<KnowledgeDocEntity>(entityName: "KnowledgeDocEntity")
        fetch.predicate = NSPredicate(format: "vertical == %@", vertical)

        do {
            return try viewContext.fetch(fetch)
        } catch {
            print("Error fetching documents: \(error)")
            return []
        }
    }

    /// Fetch all documents
    public func fetchAllDocuments() -> [KnowledgeDocEntity] {
        let fetch = NSFetchRequest<KnowledgeDocEntity>(entityName: "KnowledgeDocEntity")

        do {
            return try viewContext.fetch(fetch)
        } catch {
            print("Error fetching documents: \(error)")
            return []
        }
    }

    /// Upsert document
    public func upsertDocument(_ doc: KnowledgeDoc) {
        let fetch = NSFetchRequest<KnowledgeDocEntity>(entityName: "KnowledgeDocEntity")
        fetch.predicate = NSPredicate(format: "slug == %@", doc.slug)

        do {
            let results = try viewContext.fetch(fetch)
            let entity = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "KnowledgeDocEntity", into: viewContext) as! KnowledgeDocEntity

            entity.slug = doc.slug
            entity.title = doc.title
            entity.vertical = doc.vertical
            entity.contentHash = doc.contentHash
            entity.expiryDate = doc.expiryDate
            entity.sourceUrl = doc.sourceUrl
            entity.language = doc.language
            entity.ingestedAt = doc.ingestedAt

            save()
        } catch {
            print("Error upserting document: \(error)")
        }
    }

    /// Delete document by slug
    public func deleteDocument(by slug: String) {
        let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: "KnowledgeDocEntity")
        fetch.predicate = NSPredicate(format: "slug == %@", slug)

        do {
            let results = try viewContext.fetch(fetch)
            if let doc = results.first as? NSManagedObject {
                viewContext.delete(doc)
                save()
            }
        } catch {
            print("Error deleting document: \(error)")
        }
    }
}

// MARK: - Knowledge Chunk Operations

extension OTGDatabase {
    /// Fetch chunk by ID
    public func fetchChunk(by chunkId: String) -> KnowledgeChunkEntity? {
        let fetch = NSFetchRequest<KnowledgeChunkEntity>(entityName: "KnowledgeChunkEntity")
        fetch.predicate = NSPredicate(format: "chunkId == %@", chunkId)
        fetch.fetchLimit = 1

        do {
            return try viewContext.fetch(fetch).first
        } catch {
            print("Error fetching chunk: \(error)")
            return nil
        }
    }

    /// Fetch chunks by document slug
    public func fetchChunks(for docSlug: String) -> [KnowledgeChunkEntity] {
        let fetch = NSFetchRequest<KnowledgeChunkEntity>(entityName: "KnowledgeChunkEntity")
        fetch.predicate = NSPredicate(format: "docSlug == %@", docSlug)

        do {
            return try viewContext.fetch(fetch)
        } catch {
            print("Error fetching chunks: \(error)")
            return []
        }
    }

    /// Fetch all chunks
    public func fetchAllChunks() -> [KnowledgeChunkEntity] {
        let fetch = NSFetchRequest<KnowledgeChunkEntity>(entityName: "KnowledgeChunkEntity")

        do {
            return try viewContext.fetch(fetch)
        } catch {
            print("Error fetching chunks: \(error)")
            return []
        }
    }

    /// Upsert chunk
    public func upsertChunk(_ chunk: KnowledgeChunk) {
        let fetch = NSFetchRequest<KnowledgeChunkEntity>(entityName: "KnowledgeChunkEntity")
        fetch.predicate = NSPredicate(format: "chunkId == %@", chunk.chunkId)

        do {
            let results = try viewContext.fetch(fetch)
            let entity = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "KnowledgeChunkEntity", into: viewContext) as! KnowledgeChunkEntity

            entity.chunkId = chunk.chunkId
            entity.docSlug = chunk.docSlug
            entity.chunkIndex = Int32(chunk.chunkIndex)
            entity.content = chunk.content
            entity.contentHash = chunk.contentHash
            entity.embedding = KnowledgeChunk.floatsToBytes(chunk.embedding)
            entity.sourceDocument = chunk.sourceDocument
            entity.sourceEdition = chunk.sourceEdition
            entity.sourceSection = chunk.sourceSection
            entity.sourcePage = Int32(chunk.sourcePage)
            entity.sourceUrl = chunk.sourceUrl
            entity.verbatimExcerpt = chunk.verbatimExcerpt
            entity.expiryDate = chunk.expiryDate
            entity.language = chunk.language
            entity.ingestedAt = chunk.ingestedAt

            save()
        } catch {
            print("Error upserting chunk: \(error)")
        }
    }

    /// Batch upsert chunks
    public func upsertChunks(_ chunks: [KnowledgeChunk]) {
        for chunk in chunks {
            upsertChunk(chunk)
        }
    }

    /// Delete chunks for document
    public func deleteChunks(for docSlug: String) {
        let fetch = NSFetchRequest<NSFetchRequestResult>(entityName: "KnowledgeChunkEntity")
        fetch.predicate = NSPredicate(format: "docSlug == %@", docSlug)

        do {
            let results = try viewContext.fetch(fetch)
            for result in results {
                if let chunk = result as? NSManagedObject {
                    viewContext.delete(chunk)
                }
            }
            save()
        } catch {
            print("Error deleting chunks: \(error)")
        }
    }
}

// MARK: - Formulary Operations

extension OTGDatabase {
    /// Fetch formulary entry by drug
    public func fetchFormularyEntry(by drug: String) -> FormularyEntryEntity? {
        let fetch = NSFetchRequest<FormularyEntryEntity>(entityName: "FormularyEntryEntity")
        fetch.predicate = NSPredicate(format: "drug == %@", drug)
        fetch.fetchLimit = 1

        do {
            return try viewContext.fetch(fetch).first
        } catch {
            print("Error fetching formulary entry: \(error)")
            return nil
        }
    }

    /// Fetch all formulary entries
    public func fetchAllFormularyEntries() -> [FormularyEntryEntity] {
        let fetch = NSFetchRequest<FormularyEntryEntity>(entityName: "FormularyEntryEntity")

        do {
            return try viewContext.fetch(fetch)
        } catch {
            print("Error fetching formulary entries: \(error)")
            return []
        }
    }

    /// Upsert formulary entry
    public func upsertFormularyEntry(_ entry: FormularyEntry) {
        let fetch = NSFetchRequest<FormularyEntryEntity>(entityName: "FormularyEntryEntity")
        fetch.predicate = NSPredicate(format: "drug == %@", entry.drug)

        do {
            let results = try viewContext.fetch(fetch)
            let entity = results.first ?? NSEntityDescription.insertNewObject(forEntityName: "FormularyEntryEntity", into: viewContext) as! FormularyEntryEntity

            entity.drug = entry.drug
            entity.genericName = entry.genericName
            entity.localNamesJson = entry.localNamesJson() ?? "{}"
            entity.indication = entry.indication
            entity.dose = entry.dose
            entity.route = entry.route
            entity.timing = entry.timing
            entity.alternativeDose = entry.alternativeDose
            entity.contraindicationsJson = try JSONEncoder().encode(entry.contraindications).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
            entity.warningsJson = try JSONEncoder().encode(entry.warnings).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
            entity.source = entry.source
            entity.sourceChunkId = entry.sourceChunkId
            entity.sourceUrl = entry.sourceUrl
            entity.whoEmlListed = entry.whoEmlListed
            entity.clinicalStatus = entry.clinicalStatus
            entity.reviewedBy = entry.reviewedBy
            entity.reviewedAt = entry.reviewedAt
            entity.expiryDate = entry.expiryDate

            save()
        } catch {
            print("Error upserting formulary entry: \(error)")
        }
    }

    /// Batch upsert formulary entries
    public func upsertFormularyEntries(_ entries: [FormularyEntry]) {
        for entry in entries {
            upsertFormularyEntry(entry)
        }
    }
}
