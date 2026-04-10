package org.unfpa.otg.sync

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.unfpa.otg.knowledge.KnowledgeRepository
import org.unfpa.otg.knowledge.FormularyRepository
import org.unfpa.otg.knowledge.EmbeddingEngine
import org.unfpa.otg.knowledge.VectorSearch

/**
 * Integration tests for offline clinical knowledge access.
 * Verifies that all clinical data is fully accessible without network connectivity.
 */
@RunWith(AndroidJUnit4::class)
class OfflineAccessTest {

    private lateinit var context: Context
    private lateinit var knowledgeRepository: KnowledgeRepository
    private lateinit var formularyRepository: FormularyRepository
    private lateinit var bundleManager: BundleManager

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        val embeddingEngine = EmbeddingEngine(context)
        val vectorSearch = VectorSearch()
        knowledgeRepository = KnowledgeRepository(context, embeddingEngine, vectorSearch)
        formularyRepository = FormularyRepository(context)
        bundleManager = BundleManager(context)
    }

    /**
     * Test that all knowledge chunks are available offline.
     */
    @Test
    fun testAllChunksAvailableOffline() = runTest {
        knowledgeRepository.initialise()

        val allChunks = knowledgeRepository.getAllChunks()
        assert(allChunks.isNotEmpty()) { "Should have chunks available offline" }

        val chunkCount = allChunks.size
        assert(chunkCount > 100) { "Should have substantial chunk database (got $chunkCount)" }

        // Verify all chunks have required offline data
        allChunks.forEach { chunk ->
            assert(chunk.embedding.isNotEmpty()) { "Chunk ${chunk.chunkId} missing embedding" }
            assert(chunk.content.isNotBlank()) { "Chunk ${chunk.chunkId} missing content" }
            assert(chunk.sourceDocument.isNotBlank()) { "Chunk ${chunk.chunkId} missing source" }
        }
    }

    /**
     * Test that all formulary drugs are available offline.
     */
    @Test
    fun testAllDrugsAvailableOffline() = runTest {
        formularyRepository.initialise()

        val allDrugs = formularyRepository.getAllDrugs()
        assert(allDrugs.isNotEmpty()) { "Should have drugs available offline" }

        val drugCount = allDrugs.size
        assert(drugCount > 20) { "Should have substantial drug database (got $drugCount)" }

        // Verify all drugs have complete information
        allDrugs.forEach { drug ->
            assert(drug.drug.isNotBlank()) { "Drug missing ID" }
            assert(drug.genericName.isNotBlank()) { "Drug missing generic name" }
            assert(drug.dose.isNotBlank()) { "Drug missing dose information" }
            assert(drug.route.isNotBlank()) { "Drug missing route information" }
        }
    }

    /**
     * Test semantic search works offline.
     */
    @Test
    fun testSemanticSearchOffline() = runTest {
        knowledgeRepository.initialise()

        // Search without any network calls
        val results = knowledgeRepository.searchClinical(
            query = "postpartum hemorrhage emergency management",
            topK = 5
        )

        assert(results.isNotEmpty()) { "Semantic search should work offline" }
        results.forEach { result ->
            // Verify result completeness
            assert(result.chunkId.isNotBlank())
            assert(result.content.isNotBlank())
            assert(result.score >= 0f && result.score <= 1f)
        }
    }

    /**
     * Test drug lookup works offline.
     */
    @Test
    fun testDrugLookupOffline() = runTest {
        formularyRepository.initialise()

        // Drug lookups should work entirely offline
        val drugs = listOf("oxytocin", "metformin", "aspirin", "amoxicillin")
        drugs.forEach { drugName ->
            val card = formularyRepository.getDrugCard(drugName)
            if (card != null) {
                assert(card.dose.isNotBlank())
                assert(card.route.isNotBlank())
                assert(card.source.isNotBlank())
            }
        }
    }

    /**
     * Test citations are available offline.
     */
    @Test
    fun testCitationsAvailableOffline() = runTest {
        knowledgeRepository.initialise()

        val results = knowledgeRepository.searchClinical("maternal care", topK = 3)
        assert(results.isNotEmpty()) { "Should have results" }

        results.forEach { result ->
            val citations = knowledgeRepository.getCitations(result.chunkId)
            assert(citations.isNotEmpty()) { "Should have citations for chunk ${result.chunkId}" }

            citations.forEach { citation ->
                assert(citation.sourceDocument.isNotBlank())
                assert(citation.sourceSection.isNotBlank())
                assert(citation.verbatimExcerpt.isNotBlank())
            }
        }
    }

    /**
     * Test bundle status tracking works offline.
     */
    @Test
    fun testBundleStatusOffline() = runTest {
        val status = bundleManager.getBundleStatus()

        // Status should be accessible even if bundle not downloaded
        assert(status != null) { "Bundle status should be available" }

        if (status.isAvailable) {
            assert(status.version != null) { "Available bundle should have version" }
            assert(status.chunkCount > 0) { "Available bundle should have chunks" }
            assert(status.drugCount > 0) { "Available bundle should have drugs" }
        }
    }

    /**
     * Test guideline retrieval works offline.
     */
    @Test
    fun testGuidelineRetrievalOffline() = runTest {
        knowledgeRepository.initialise()

        val conditions = listOf(
            "eclampsia",
            "preeclampsia",
            "postpartum hemorrhage",
            "sepsis",
            "maternal anemia"
        )

        conditions.forEach { condition ->
            val guidelines = knowledgeRepository.getClinicalGuidelines(condition)
            assert(guidelines.isNotEmpty()) {
                "Should retrieve guidelines for $condition offline"
            }
        }
    }

    /**
     * Test hybrid search works offline.
     */
    @Test
    fun testHybridSearchOffline() = runTest {
        knowledgeRepository.initialise()

        val results = knowledgeRepository.searchHybrid(
            query = "oxytocin dosage pregnancy",
            topK = 5,
            keywordWeight = 0.3f,
            semanticWeight = 0.7f
        )

        assert(results.isNotEmpty()) { "Hybrid search should work offline" }
        results.forEach { result ->
            assert(result.score >= 0f) { "Result should have valid score" }
        }
    }

    /**
     * Test vertical filtering works offline.
     */
    @Test
    fun testVerticalFilteringOffline() = runTest {
        knowledgeRepository.initialise()

        val chunks = knowledgeRepository.getChunksByVertical("WHO")
        assert(chunks.isNotEmpty()) { "Should find chunks for WHO vertical offline" }
    }

    /**
     * Test search with no network latency.
     * Verifies that all processing is local and fast.
     */
    @Test
    fun testSearchLatencyOffline() = runTest {
        knowledgeRepository.initialise()

        val iterations = 5
        val latencies = mutableListOf<Long>()

        repeat(iterations) {
            val start = System.currentTimeMillis()
            val results = knowledgeRepository.searchClinical("pregnancy", topK = 5)
            val elapsed = System.currentTimeMillis() - start
            latencies.add(elapsed)
            assert(results.isNotEmpty())
        }

        val avgLatency = latencies.average()
        assert(avgLatency < 500) {
            "Average search latency should be < 500ms offline (got ${avgLatency.toInt()}ms)"
        }

        val maxLatency = latencies.maxOrNull() ?: 0
        assert(maxLatency < 1000) {
            "Max search latency should be < 1000ms offline (got ${maxLatency}ms)"
        }
    }

    /**
     * Test data consistency - all retrieved data should be complete and valid.
     */
    @Test
    fun testDataConsistency() = runTest {
        knowledgeRepository.initialise()
        formularyRepository.initialise()

        // Verify all chunks have valid embeddings
        val chunks = knowledgeRepository.getAllChunks()
        chunks.forEach { chunk ->
            // 384-dimensional float32 = 1536 bytes
            assert(chunk.embedding.size == 1536) {
                "Chunk ${chunk.chunkId} has invalid embedding size: ${chunk.embedding.size}"
            }
        }

        // Verify drug data consistency
        val drugs = formularyRepository.getAllDrugs()
        drugs.forEach { drug ->
            // Verify local names JSON is valid
            try {
                kotlinx.serialization.json.Json.decodeFromString<Map<String, String>>(
                    drug.localNamesJson
                )
            } catch (e: Exception) {
                assert(false) { "Drug ${drug.drug} has invalid localNamesJson" }
            }

            // Verify contraindications JSON is valid
            try {
                kotlinx.serialization.json.Json.decodeFromString<List<String>>(
                    drug.contraindicationsJson
                )
            } catch (e: Exception) {
                assert(false) { "Drug ${drug.drug} has invalid contraindicationsJson" }
            }
        }
    }

    /**
     * Test knowledge base size and coverage.
     */
    @Test
    fun testKnowledgeBaseCoverage() = runTest {
        knowledgeRepository.initialise()
        formularyRepository.initialise()

        val chunks = knowledgeRepository.getAllChunks()
        val drugs = formularyRepository.getAllDrugs()

        // Verify minimum coverage
        assert(chunks.size > 100) { "Knowledge base should have > 100 chunks" }
        assert(drugs.size > 20) { "Formulary should have > 20 drugs" }

        // Verify coverage of key conditions
        val keyConditions = listOf("eclampsia", "hemorrhage", "anemia", "infection")
        keyConditions.forEach { condition ->
            val results = knowledgeRepository.getClinicalGuidelines(condition)
            assert(results.isNotEmpty()) {
                "Knowledge base should cover $condition"
            }
        }
    }
}
