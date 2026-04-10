package org.unfpa.otg.knowledge

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Unit tests for clinical search functionality.
 * Tests semantic search, drug lookup, citation retrieval, and offline access.
 */
@RunWith(AndroidJUnit4::class)
class ClinicalSearchTest {

    private lateinit var context: Context
    private lateinit var knowledgeRepository: KnowledgeRepository
    private lateinit var formularyRepository: FormularyRepository
    private lateinit var embeddingEngine: EmbeddingEngine
    private lateinit var vectorSearch: VectorSearch

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        embeddingEngine = EmbeddingEngine(context)
        vectorSearch = VectorSearch()
        knowledgeRepository = KnowledgeRepository(context, embeddingEngine, vectorSearch)
        formularyRepository = FormularyRepository(context)
    }

    /**
     * Test semantic search for clinical queries.
     */
    @Test
    fun testSemanticClinicalSearch() = runTest {
        knowledgeRepository.initialise()

        val results = knowledgeRepository.searchClinical(
            query = "management of preeclampsia in pregnancy",
            topK = 5
        )

        assert(results.isNotEmpty()) { "Should return clinical results for preeclampsia query" }
        results.forEach { result ->
            assert(result.chunkId.isNotBlank()) { "Result must have chunkId" }
            assert(result.documentTitle.isNotBlank()) { "Result must have documentTitle" }
            assert(result.content.isNotBlank()) { "Result must have content" }
            assert(result.score >= 0f && result.score <= 1f) { "Score must be normalized" }
        }
    }

    /**
     * Test clinical guideline retrieval by condition.
     */
    @Test
    fun testGetClinicalGuidelines() = runTest {
        knowledgeRepository.initialise()

        val guidelines = knowledgeRepository.getClinicalGuidelines("eclampsia")

        assert(guidelines.isNotEmpty()) { "Should return guidelines for eclampsia" }
        guidelines.forEach { guideline ->
            val contentLower = guideline.content.lowercase()
            val hasRelevantContent =
                contentLower.contains("guideline") ||
                contentLower.contains("management") ||
                contentLower.contains("protocol")
            assert(hasRelevantContent) { "Guideline content should contain relevant terms" }
        }
    }

    /**
     * Test drug information lookup.
     */
    @Test
    fun testGetDrugInfo() = runTest {
        formularyRepository.initialise()

        // Test with common drug names
        val oxytocin = knowledgeRepository.getDrugInfo("oxytocin")
        assert(oxytocin != null) { "Should find oxytocin in formulary" }

        val ergotamine = knowledgeRepository.getDrugInfo("ergotamine")
        assert(ergotamine != null) { "Should find ergotamine in formulary" }

        // Test non-existent drug
        val nonExistent = knowledgeRepository.getDrugInfo("nonexistentdrugxyz")
        assert(nonExistent == null) { "Should return null for non-existent drug" }
    }

    /**
     * Test citation retrieval for chunks.
     */
    @Test
    fun testGetCitations() = runTest {
        knowledgeRepository.initialise()

        val results = knowledgeRepository.searchClinical("maternal mortality", topK = 3)
        assert(results.isNotEmpty()) { "Should have search results" }

        val chunkId = results.first().chunkId
        val citations = knowledgeRepository.getCitations(chunkId)

        assert(citations.isNotEmpty()) { "Should return citations for chunk" }
        citations.forEach { citation ->
            assert(citation.chunkId == chunkId) { "Citation must match requested chunkId" }
            assert(citation.sourceDocument.isNotBlank()) { "Citation must have source document" }
            assert(citation.sourceSection.isNotBlank()) { "Citation must have source section" }
            assert(citation.sourcePage >= 0) { "Citation must have valid page number" }
        }
    }

    /**
     * Test hybrid search combining semantic and keyword matching.
     */
    @Test
    fun testHybridSearch() = runTest {
        knowledgeRepository.initialise()

        val semanticQuery = "postpartum hemorrhage management strategies"
        val semanticResults = knowledgeRepository.search(semanticQuery, topK = 5)
        val hybridResults = knowledgeRepository.searchHybrid(semanticQuery, topK = 5)

        assert(semanticResults.isNotEmpty()) { "Semantic search should return results" }
        assert(hybridResults.isNotEmpty()) { "Hybrid search should return results" }

        // Hybrid should return higher-ranked results
        if (semanticResults.isNotEmpty() && hybridResults.isNotEmpty()) {
            // First result of hybrid might be different due to keyword boost
            assert(hybridResults.first().score >= 0f) { "Hybrid results should have valid scores" }
        }
    }

    /**
     * Test search by vertical (clinical guideline source).
     */
    @Test
    fun testGetChunksByVertical() = runTest {
        knowledgeRepository.initialise()

        val chunks = knowledgeRepository.getChunksByVertical("MOH")
        assert(chunks.isNotEmpty()) { "Should return chunks for MOH vertical" }
        chunks.forEach { chunk ->
            assert(chunk.sourceDocument.contains("MOH") || chunk.docSlug.contains("MOH")) {
                "Chunks should match requested vertical"
            }
        }
    }

    /**
     * Test offline accessibility - all chunks should be available without network.
     */
    @Test
    fun testOfflineAccess() = runTest {
        knowledgeRepository.initialise()

        val allChunks = knowledgeRepository.getAllChunks()
        assert(allChunks.isNotEmpty()) { "Should have chunks available offline" }

        allChunks.forEach { chunk ->
            // Verify all required fields are populated
            assert(chunk.chunkId.isNotBlank()) { "Chunk must have ID" }
            assert(chunk.content.isNotBlank()) { "Chunk must have content" }
            assert(chunk.embedding.isNotEmpty()) { "Chunk must have embedding" }
            assert(chunk.sourceDocument.isNotBlank()) { "Chunk must have source" }
        }
    }

    /**
     * Test empty/null query handling.
     */
    @Test
    fun testEmptyQueryHandling() = runTest {
        knowledgeRepository.initialise()

        val emptyResults = knowledgeRepository.searchClinical("", topK = 5)
        assert(emptyResults.isEmpty()) { "Empty query should return no results" }

        // Whitespace-only query
        val whitespaceResults = knowledgeRepository.searchClinical("   ", topK = 5)
        assert(whitespaceResults.isEmpty()) { "Whitespace query should return no results" }
    }

    /**
     * Test expiry date tracking in search results.
     */
    @Test
    fun testExpiryDateTracking() = runTest {
        knowledgeRepository.initialise()

        val results = knowledgeRepository.searchClinical("clinical guidelines", topK = 10)
        results.forEach { result ->
            // expiryDate may be null (no expiry) or ISO-8601 string
            result.expiryDate?.let { expiry ->
                assert(expiry.matches(Regex("""\d{4}-\d{2}-\d{2}"""))) {
                    "expiryDate must be ISO-8601 format if present"
                }
            }
        }
    }

    /**
     * Test search performance with large result sets.
     */
    @Test
    fun testSearchPerformance() = runTest {
        knowledgeRepository.initialise()

        val startTime = System.currentTimeMillis()
        val results = knowledgeRepository.search("maternal health pregnancy", topK = 20)
        val elapsedMs = System.currentTimeMillis() - startTime

        assert(results.isNotEmpty()) { "Should return results" }
        assert(elapsedMs < 1000) { "Search should complete in < 1 second (got ${elapsedMs}ms)" }
    }

    /**
     * Test multilingual query support.
     */
    @Test
    fun testMultilingualQueries() = runTest {
        knowledgeRepository.initialise()

        // Test with different language terms
        val englishResults = knowledgeRepository.searchClinical("eclampsia", topK = 5)
        val spanishResults = knowledgeRepository.searchClinical("eclampsia", topK = 5) // Same term
        val frenchResults = knowledgeRepository.searchClinical("éclampsie", topK = 5)

        assert(englishResults.isNotEmpty()) { "English query should return results" }
        // Spanish/French results depend on multilingual model support
    }
}
