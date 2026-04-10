import Foundation
import Combine

/// KnowledgeService manages clinical knowledge search and retrieval
/// Provides semantic search interface and loads knowledge bundles
public class KnowledgeService: ObservableObject {
    @Published var isInitialized = false
    @Published var searchResults: [KnowledgeSearchResult] = []
    @Published var isSearching = false
    @Published var lastError: Error?

    private let database: OTGDatabase
    private let embeddingService: EmbeddingService

    public init(database: OTGDatabase = .shared) {
        self.database = database
        self.embeddingService = EmbeddingService()
    }

    /// Initialize knowledge base from bundled assets
    public func initialize() async {
        defer { DispatchQueue.main.async { self.isInitialized = true } }

        do {
            // Load index.json from app bundle
            guard let indexUrl = Bundle.main.url(forResource: "index", withExtension: "json", subdirectory: "knowledge") else {
                print("Knowledge index not found in bundle")
                return
            }

            let indexData = try Data(contentsOf: indexUrl)
            let index = try JSONDecoder().decode(KnowledgeIndex.self, from: indexData)

            // Load embedding vectors
            guard let vectorsUrl = Bundle.main.url(forResource: "vectors", withExtension: "bin", subdirectory: "embeddings") else {
                print("Embeddings binary not found in bundle")
                return
            }

            let vectorsData = try Data(contentsOf: vectorsUrl)

            // Populate database
            populateDatabase(from: index, vectorsData: vectorsData)
        } catch {
            DispatchQueue.main.async {
                self.lastError = error
            }
            print("Error initializing knowledge: \(error)")
        }
    }

    /// Search knowledge base semantically
    public func search(
        query: String,
        topK: Int = 5,
        verticals: [String] = []
    ) async {
        DispatchQueue.main.async { self.isSearching = true }
        defer { DispatchQueue.main.async { self.isSearching = false } }

        do {
            let queryEmbedding = try await embeddingService.embed(query)
            let results = performVectorSearch(queryEmbedding: queryEmbedding, topK: topK * 3, verticals: verticals)
            let filtered = results.prefix(topK)

            DispatchQueue.main.async {
                self.searchResults = Array(filtered)
            }
        } catch {
            DispatchQueue.main.async {
                self.lastError = error
            }
        }
    }

    /// Get chunk by ID
    public func getChunk(by chunkId: String) -> KnowledgeChunk? {
        guard let entity = database.fetchChunk(by: chunkId) else { return nil }
        return convertChunkEntity(entity)
    }

    /// Get document by slug
    public func getDocument(by slug: String) -> KnowledgeDoc? {
        guard let entity = database.fetchDocument(by: slug) else { return nil }
        return KnowledgeDoc(
            slug: entity.slug,
            title: entity.title,
            vertical: entity.vertical,
            contentHash: entity.contentHash,
            expiryDate: entity.expiryDate,
            sourceUrl: entity.sourceUrl,
            language: entity.language,
            ingestedAt: entity.ingestedAt
        )
    }

    /// Get all documents for a vertical
    public func getDocuments(for vertical: String) -> [KnowledgeDoc] {
        let entities = database.fetchDocuments(by: vertical)
        return entities.map { entity in
            KnowledgeDoc(
                slug: entity.slug,
                title: entity.title,
                vertical: entity.vertical,
                contentHash: entity.contentHash,
                expiryDate: entity.expiryDate,
                sourceUrl: entity.sourceUrl,
                language: entity.language,
                ingestedAt: entity.ingestedAt
            )
        }
    }

    /// Get knowledge base statistics
    public func getStatistics() -> KnowledgeStatistics {
        return KnowledgeStatistics(
            documentCount: database.getDocumentCount(),
            chunkCount: database.getChunkCount(),
            formularyCount: database.getFormularyCount()
        )
    }

    // MARK: - Private

    private func populateDatabase(from index: KnowledgeIndex, vectorsData: Data) {
        var floatBuffer = [Float]()
        vectorsData.withUnsafeBytes { buffer in
            let floatPtr = buffer.bindMemory(to: Float.self)
            floatBuffer = Array(floatPtr)
        }

        var docMap: [String: KnowledgeDoc] = [:]
        var chunks: [KnowledgeChunk] = []

        for (idx, chunkData) in index.chunks.enumerated() {
            // Extract document
            let docSlug = chunkData.docSlug
            if docMap[docSlug] == nil {
                docMap[docSlug] = KnowledgeDoc(
                    slug: docSlug,
                    title: chunkData.documentTitle,
                    vertical: chunkData.vertical,
                    contentHash: chunkData.contentHash,
                    expiryDate: chunkData.expiryDate,
                    sourceUrl: chunkData.sourceUrl.isEmpty ? nil : chunkData.sourceUrl,
                    language: chunkData.language,
                    ingestedAt: Int64(Date().timeIntervalSince1970 * 1000)
                )
            }

            // Extract embedding
            let embeddingStart = idx * 384
            let embeddingEnd = embeddingStart + 384
            let embedding = Array(floatBuffer[embeddingStart..<embeddingEnd])

            chunks.append(
                KnowledgeChunk(
                    chunkId: chunkData.chunkId,
                    docSlug: docSlug,
                    chunkIndex: chunkData.chunkIndex,
                    content: chunkData.content,
                    contentHash: chunkData.contentHash,
                    embedding: embedding,
                    sourceDocument: chunkData.sourceDocument,
                    sourceEdition: chunkData.sourceEdition,
                    sourceSection: chunkData.sourceSection,
                    sourcePage: chunkData.sourcePage,
                    sourceUrl: chunkData.sourceUrl,
                    verbatimExcerpt: chunkData.verbatimExcerpt,
                    expiryDate: chunkData.expiryDate,
                    language: chunkData.language
                )
            )
        }

        // Save to database
        for doc in docMap.values {
            database.upsertDocument(doc)
        }
        database.upsertChunks(chunks)
    }

    private func performVectorSearch(
        queryEmbedding: [Float],
        topK: Int,
        verticals: [String]
    ) -> [KnowledgeSearchResult] {
        let chunks = database.fetchAllChunks()

        // Compute cosine similarity scores
        var scored: [(chunk: KnowledgeChunkEntity, score: Float)] = []

        for chunk in chunks {
            let embedding = KnowledgeChunk.bytesToFloats(chunk.embedding)
            let score = cosineSimilarity(queryEmbedding, embedding)
            scored.append((chunk, score))
        }

        // Filter by vertical if needed
        let filtered: [(chunk: KnowledgeChunkEntity, score: Float)]
        if verticals.isEmpty {
            filtered = scored
        } else {
            filtered = scored.filter { item in
                verticals.contains { v in
                    item.chunk.document?.vertical == v ||
                    (v.starts(with: "MOH_") && item.chunk.document?.vertical == v)
                }
            }
        }

        // Sort by score and take top K
        let sorted = filtered.sorted { $0.score > $1.score }.prefix(topK)

        return sorted.map { item in
            KnowledgeSearchResult(
                chunkId: item.chunk.chunkId,
                documentTitle: item.chunk.document?.title ?? "",
                docSlug: item.chunk.docSlug,
                content: item.chunk.content,
                sourcePage: Int(item.chunk.sourcePage),
                sourceSection: item.chunk.sourceSection,
                sourceDocument: item.chunk.sourceDocument,
                sourceUrl: item.chunk.sourceUrl,
                verbatimExcerpt: item.chunk.verbatimExcerpt,
                expiryDate: item.chunk.expiryDate,
                score: item.score
            )
        }
    }

    private func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
        let dotProduct = zip(a, b).map(*).reduce(0, +)
        let magnitudeA = sqrt(a.map { $0 * $0 }.reduce(0, +))
        let magnitudeB = sqrt(b.map { $0 * $0 }.reduce(0, +))

        guard magnitudeA > 0, magnitudeB > 0 else { return 0 }
        return dotProduct / (magnitudeA * magnitudeB)
    }

    private func convertChunkEntity(_ entity: KnowledgeChunkEntity) -> KnowledgeChunk {
        KnowledgeChunk(
            chunkId: entity.chunkId,
            docSlug: entity.docSlug,
            chunkIndex: Int(entity.chunkIndex),
            content: entity.content,
            contentHash: entity.contentHash,
            embedding: KnowledgeChunk.bytesToFloats(entity.embedding),
            sourceDocument: entity.sourceDocument,
            sourceEdition: entity.sourceEdition,
            sourceSection: entity.sourceSection,
            sourcePage: Int(entity.sourcePage),
            sourceUrl: entity.sourceUrl,
            verbatimExcerpt: entity.verbatimExcerpt,
            expiryDate: entity.expiryDate,
            language: entity.language,
            ingestedAt: entity.ingestedAt
        )
    }
}

// MARK: - Supporting Types

public struct KnowledgeIndex: Codable {
    public let version: String
    public let generatedAt: String
    public let chunkCount: Int
    public let chunks: [IndexChunk]
}

public struct IndexChunk: Codable {
    public let chunkId: String
    public let docSlug: String
    public let chunkIndex: Int
    public let content: String
    public let contentHash: String
    public let documentTitle: String
    public let vertical: String
    public let sourceDocument: String
    public let sourceEdition: String
    public let sourceSection: String
    public let sourcePage: Int
    public let sourceUrl: String
    public let verbatimExcerpt: String
    public let expiryDate: String?
    public let language: String
}

public struct KnowledgeStatistics {
    public let documentCount: Int
    public let chunkCount: Int
    public let formularyCount: Int
}
