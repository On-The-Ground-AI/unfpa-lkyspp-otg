package org.unfpa.otg.ui.drug

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.unfpa.otg.knowledge.FormularyRepository
import java.util.*

/**
 * DrugLookupViewModel — manages drug search and display for DrugLookupScreen.
 *
 * Responsibilities:
 *   - Search formulary by drug name (generic and local names)
 *   - Handle language-specific name resolution
 *   - Format drug information for display
 *   - Track UI state (loading, errors, results)
 *   - Manage expiry date validation
 */
class DrugLookupViewModel(application: Application) : AndroidViewModel(application) {

    private val formularyRepo = FormularyRepository(application)

    data class DrugResult(
        val drug: String,
        val genericName: String,
        val displayName: String,
        val indication: String,
        val dose: String,
        val route: String,
        val timing: String,
        val alternativeDose: String?,
        val contraindications: List<String>,
        val warnings: List<String>,
        val source: String,
        val sourceUrl: String,
        val whoEmlListed: Boolean,
        val clinicalStatus: String,
        val isExpired: Boolean,
    )

    data class UiState(
        val isSearching: Boolean = false,
        val searchResults: List<DrugResult> = emptyList(),
        val searchError: String? = null,
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            formularyRepo.initialise()
        }
    }

    /**
     * Search for a drug by name (generic or local).
     * Performs case-insensitive partial matching.
     */
    fun searchDrug(query: String) {
        if (query.isBlank()) {
            _uiState.value = UiState(searchResults = emptyList())
            return
        }

        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSearching = true, searchError = null)

                // Get all drugs and filter by query
                val allDrugs = formularyRepo.getAllDrugs()
                val normalised = query.lowercase().trim()

                val results = allDrugs
                    .filter { entry ->
                        entry.drug.contains(normalised) ||
                        entry.genericName.lowercase().contains(normalised) ||
                        // Check local names
                        try {
                            val localNames = kotlinx.serialization.json.Json
                                .decodeFromString<Map<String, String>>(entry.localNamesJson)
                            localNames.values.any { name ->
                                name.lowercase().contains(normalised)
                            }
                        } catch (e: Exception) {
                            false
                        }
                    }
                    .map { entry ->
                        val localNames = try {
                            kotlinx.serialization.json.Json
                                .decodeFromString<Map<String, String>>(entry.localNamesJson)
                        } catch (e: Exception) {
                            emptyMap()
                        }

                        val contraindications = try {
                            kotlinx.serialization.json.Json
                                .decodeFromString<List<String>>(entry.contraindicationsJson)
                        } catch (e: Exception) {
                            emptyList()
                        }

                        val warnings = try {
                            kotlinx.serialization.json.Json
                                .decodeFromString<List<String>>(entry.warningsJson)
                        } catch (e: Exception) {
                            emptyList()
                        }

                        val isExpired = entry.expiryDate?.let { expiry ->
                            try {
                                val parts = expiry.split("-")
                                val expiryYear = parts[0].toInt()
                                val expiryMonth = parts[1].toInt()
                                val now = Calendar.getInstance()
                                val nowYear = now.get(Calendar.YEAR)
                                val nowMonth = now.get(Calendar.MONTH) + 1
                                expiryYear < nowYear || (expiryYear == nowYear && expiryMonth < nowMonth)
                            } catch (e: Exception) {
                                false
                            }
                        } ?: false

                        // Get language-specific name (default to en, then English fallback, then generic)
                        val currentLanguage = Locale.getDefault().language
                        val displayName = localNames[currentLanguage]
                            ?: localNames["en"]
                            ?: entry.genericName

                        DrugResult(
                            drug = entry.drug,
                            genericName = entry.genericName,
                            displayName = displayName,
                            indication = entry.indication,
                            dose = entry.dose,
                            route = entry.route,
                            timing = entry.timing,
                            alternativeDose = entry.alternativeDose,
                            contraindications = contraindications,
                            warnings = warnings,
                            source = entry.source,
                            sourceUrl = entry.sourceUrl,
                            whoEmlListed = entry.whoEmlListed,
                            clinicalStatus = entry.clinicalStatus,
                            isExpired = isExpired,
                        )
                    }
                    .sortedWith(compareBy(
                        { it.isExpired },
                        { !it.whoEmlListed },
                        { it.clinicalStatus != "VERIFIED" }
                    ))

                _uiState.value = UiState(
                    isSearching = false,
                    searchResults = results,
                    searchError = if (results.isEmpty()) null else null,
                )
            } catch (e: Exception) {
                _uiState.value = UiState(
                    isSearching = false,
                    searchError = e.message ?: "Unknown error",
                )
            }
        }
    }

    /**
     * Get a single drug card by drug name (for embedding in dose cards).
     */
    fun getDrugCard(drugName: String) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSearching = true, searchError = null)
                val card = formularyRepo.getDrugCard(drugName)
                if (card != null) {
                    val result = DrugResult(
                        drug = card.drug,
                        genericName = card.displayName, // For display
                        displayName = card.displayName,
                        indication = card.indication,
                        dose = card.dose,
                        route = card.route,
                        timing = card.timing,
                        alternativeDose = card.alternativeDose,
                        contraindications = card.contraindications,
                        warnings = card.warnings,
                        source = card.source,
                        sourceUrl = card.sourceUrl,
                        whoEmlListed = card.whoEmlListed,
                        clinicalStatus = card.clinicalStatus,
                        isExpired = card.isExpired,
                    )
                    _uiState.value = UiState(
                        isSearching = false,
                        searchResults = listOf(result),
                    )
                } else {
                    _uiState.value = UiState(
                        isSearching = false,
                        searchError = "Drug not found",
                    )
                }
            } catch (e: Exception) {
                _uiState.value = UiState(
                    isSearching = false,
                    searchError = e.message ?: "Unknown error",
                )
            }
        }
    }

    /**
     * Clear search results.
     */
    fun clearSearch() {
        _uiState.value = UiState()
    }
}
