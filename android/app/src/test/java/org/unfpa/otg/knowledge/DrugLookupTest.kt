package org.unfpa.otg.knowledge

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Unit tests for drug lookup functionality.
 * Tests formulary access, multi-language support, and offline availability.
 */
@RunWith(AndroidJUnit4::class)
class DrugLookupTest {

    private lateinit var context: Context
    private lateinit var formularyRepository: FormularyRepository

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        formularyRepository = FormularyRepository(context)
    }

    /**
     * Test basic drug card retrieval.
     */
    @Test
    fun testGetDrugCard() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("oxytocin")

        assert(card != null) { "Should find oxytocin" }
        card?.let {
            assert(it.drug.equals("oxytocin", ignoreCase = true)) { "Drug name should match" }
            assert(it.displayName.isNotBlank()) { "Display name should be populated" }
            assert(it.indication.isNotBlank()) { "Indication should be populated" }
            assert(it.dose.isNotBlank()) { "Dose should be populated" }
            assert(it.route.isNotBlank()) { "Route should be populated" }
            assert(it.timing.isNotBlank()) { "Timing should be populated" }
        }
    }

    /**
     * Test case-insensitive drug lookup.
     */
    @Test
    fun testCaseInsensitiveLookup() = runTest {
        formularyRepository.initialise()

        val lowercase = formularyRepository.getDrugCard("metformin")
        val uppercase = formularyRepository.getDrugCard("METFORMIN")
        val mixedcase = formularyRepository.getDrugCard("MetFormin")

        // All variants should return the same drug if it exists
        if (lowercase != null) {
            assert(uppercase != null) { "Should find drug with uppercase query" }
            assert(mixedcase != null) { "Should find drug with mixed case query" }
        }
    }

    /**
     * Test partial drug name matching.
     */
    @Test
    fun testPartialNameMatching() = runTest {
        formularyRepository.initialise()

        val partial = formularyRepository.getDrugCard("amp")
        assert(partial != null) { "Should find drug with partial name match" }
    }

    /**
     * Test multi-language drug names.
     */
    @Test
    fun testMultilingualDrugNames() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("oxytocin", language = "en")
        assert(card != null) { "Should find drug with English language" }

        // Test with different language codes
        val card_es = formularyRepository.getDrugCard("oxytocin", language = "es")
        assert(card_es != null) { "Should find drug and fallback to generic name if language not available" }
    }

    /**
     * Test contraindications and warnings display.
     */
    @Test
    fun testContraindicationsAndWarnings() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("ergotamine")
        card?.let {
            // Ergotamine has specific contraindications
            assert(it.contraindications.isNotEmpty()) { "Should have contraindications" }
            it.contraindications.forEach { contra ->
                assert(contra.isNotBlank()) { "Each contraindication should be non-empty" }
            }

            if (it.warnings.isNotEmpty()) {
                it.warnings.forEach { warning ->
                    assert(warning.isNotBlank()) { "Each warning should be non-empty" }
                }
            }
        }
    }

    /**
     * Test WHO Essential Medicines List (EML) badge.
     */
    @Test
    fun testWhoEmlListing() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("oxytocin")
        card?.let {
            // Oxytocin should be on WHO EML
            assert(it.whoEmlListed) { "Oxytocin should be on WHO EML" }
        }
    }

    /**
     * Test clinical status (VERIFIED vs UNVERIFIED-SCAFFOLD).
     */
    @Test
    fun testClinicalStatus() = runTest {
        formularyRepository.initialise()

        val allDrugs = formularyRepository.getAllDrugs()
        allDrugs.forEach { drug ->
            val status = drug.clinicalStatus
            assert(status == "VERIFIED" || status == "UNVERIFIED-SCAFFOLD") {
                "Clinical status must be VERIFIED or UNVERIFIED-SCAFFOLD"
            }
        }
    }

    /**
     * Test expiry date validation.
     */
    @Test
    fun testExpiryDateValidation() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("oxytocin")
        card?.let {
            // isExpired should be computed correctly
            if (it.expiryDate != null) {
                assert(it.isExpired == false) { "Valid drug should not be expired" }
            }
        }
    }

    /**
     * Test alternative dose information.
     */
    @Test
    fun testAlternativeDose() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("misoprostol")
        card?.let {
            // Some drugs may have alternative dosing
            if (it.alternativeDose != null) {
                assert(it.alternativeDose.isNotBlank()) { "Alternative dose should be populated" }
            }
        }
    }

    /**
     * Test offline access - all drugs should be available without network.
     */
    @Test
    fun testOfflineDrugAccess() = runTest {
        formularyRepository.initialise()

        val allDrugs = formularyRepository.getAllDrugs()
        assert(allDrugs.isNotEmpty()) { "Should have drugs available offline" }

        allDrugs.forEach { drug ->
            // Verify required fields
            assert(drug.drug.isNotBlank()) { "Drug must have ID" }
            assert(drug.genericName.isNotBlank()) { "Drug must have generic name" }
            assert(drug.dose.isNotBlank()) { "Drug must have dose" }
            assert(drug.route.isNotBlank()) { "Drug must have route" }
        }
    }

    /**
     * Test source citation for drugs.
     */
    @Test
    fun testSourceCitation() = runTest {
        formularyRepository.initialise()

        val card = formularyRepository.getDrugCard("oxytocin")
        card?.let {
            assert(it.source.isNotBlank()) { "Should have source citation" }
            assert(it.sourceChunkId.isNotBlank()) { "Should have source chunk ID" }
            assert(it.sourceUrl.isNotEmpty()) { "Should have source URL" }
        }
    }

    /**
     * Test empty/null query handling.
     */
    @Test
    fun testEmptyQueryHandling() = runTest {
        formularyRepository.initialise()

        val empty = formularyRepository.getDrugCard("")
        assert(empty == null) { "Empty query should return null" }

        val whitespace = formularyRepository.getDrugCard("   ")
        assert(whitespace == null) { "Whitespace query should return null" }
    }

    /**
     * Test non-existent drug handling.
     */
    @Test
    fun testNonExistentDrug() = runTest {
        formularyRepository.initialise()

        val notFound = formularyRepository.getDrugCard("nonexistentdrugxyzabc")
        assert(notFound == null) { "Non-existent drug should return null" }
    }

    /**
     * Test drug lookup performance.
     */
    @Test
    fun testLookupPerformance() = runTest {
        formularyRepository.initialise()

        val startTime = System.currentTimeMillis()
        val card = formularyRepository.getDrugCard("oxytocin")
        val elapsedMs = System.currentTimeMillis() - startTime

        assert(card != null) { "Should find drug" }
        assert(elapsedMs < 500) { "Lookup should complete in < 500ms (got ${elapsedMs}ms)" }
    }

    /**
     * Test bulk drug access.
     */
    @Test
    fun testBulkDrugAccess() = runTest {
        formularyRepository.initialise()

        val startTime = System.currentTimeMillis()
        val allDrugs = formularyRepository.getAllDrugs()
        val elapsedMs = System.currentTimeMillis() - startTime

        assert(allDrugs.isNotEmpty()) { "Should have drugs" }
        assert(allDrugs.size > 10) { "Should have more than 10 drugs" }
        assert(elapsedMs < 1000) { "Bulk access should complete in < 1 second (got ${elapsedMs}ms)" }
    }

    /**
     * Test local names deserialization.
     */
    @Test
    fun testLocalNamesDeserialization() = runTest {
        formularyRepository.initialise()

        val allDrugs = formularyRepository.getAllDrugs()
        allDrugs.forEach { drug ->
            try {
                val localNames = kotlinx.serialization.json.Json
                    .decodeFromString<Map<String, String>>(drug.localNamesJson)
                // If deserialization succeeds, at least map should be valid
                assert(localNames is Map) { "Local names should deserialize to Map" }
            } catch (e: Exception) {
                // Empty JSON object is acceptable
                assert(drug.localNamesJson == "{}" || drug.localNamesJson.isEmpty()) {
                    "Local names JSON should be valid or empty"
                }
            }
        }
    }
}
