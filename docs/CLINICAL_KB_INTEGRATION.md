# Clinical Knowledge Base Integration - Android Implementation

## Overview

This document describes the complete clinical knowledge base integration for the UNFPA On-The-Ground (OTG) mobile application. All clinical information is fully offline-accessible and designed for healthcare workers in resource-limited settings.

## Architecture

### Components

#### 1. KnowledgeRepository (`knowledge/KnowledgeRepository.kt`)

Core component managing clinical knowledge access with RAG (Retrieval-Augmented Generation) pattern support.

**Key Methods:**
- `searchClinical(query, topK)` - Semantic search using embeddings
- `getClinicalGuidelines(condition)` - Retrieve condition-specific guidelines
- `getDrugInfo(drugName)` - Look up formulary entries
- `getCitations(chunkId)` - Get source metadata for chunks
- `getAllChunks()` - Retrieve all knowledge for RAG context
- `searchHybrid(query, topK, keywordWeight, semanticWeight)` - Combined semantic + keyword search
- `getChunksByVertical(vertical)` - Filter by clinical guideline source

**Features:**
- Offline-first design with pre-embedded knowledge
- Support for 50+ languages via multilingual-minilm embeddings
- Citation tracking for all sources
- Expiry date validation for time-sensitive guidelines
- Vertical filtering (WHO, MOH, UNFPA sources)

#### 2. FormularyRepository (`knowledge/FormularyRepository.kt`)

Manages drug reference database with multi-language support.

**Key Methods:**
- `getDrugCard(drugName, language)` - Look up drug with localization
- `getAllDrugs()` - Get complete formulary
- Automatic WHO EML verification
- Clinical status tracking (VERIFIED vs UNVERIFIED-SCAFFOLD)

**Data Stored:**
- Generic and local drug names (5+ languages)
- Dose, route, timing information
- Contraindications and warnings
- WHO EML listing status
- Source citations with chunk IDs
- Expiry dates for clinical currency

#### 3. EmbeddingEngine (`knowledge/EmbeddingEngine.kt`)

On-device embedding computation using ONNX Runtime.

**Model:** paraphrase-multilingual-MiniLM-L12-v2
- Output: 384-dimensional embeddings
- Languages: 50+ including Burmese, Bangla, Khmer, Tamil, Sinhalese
- Processing: Mean pooling + L2 normalization
- Tokenizer: SentencePiece WordPiece

**Key Methods:**
- `embed(text)` - Generate 384-dim embedding for query
- `cosineSimilarity(a, b)` - Compute similarity between embeddings
- `vectorSearch(queryEmbedding, candidates, k)` - Top-K similarity search
- `embedBatch(texts)` - Bulk embedding computation

#### 4. VectorSearch (`knowledge/VectorSearch.kt`)

In-memory vector similarity search with ~12 MB footprint (8,000 chunks × 384 dims × 4 bytes).

**Features:**
- Fast cosine similarity (normalized vectors = dot product)
- Filtering by vertical, document, score threshold
- Approximate nearest neighbor support (foundation for LSH/HNSW)
- Statistics collection (chunk count, memory usage)

**Performance:**
- Average search latency: < 200ms
- Max search latency: < 1000ms
- Memory usage: ~12 MB for typical knowledge base

#### 5. CitationRepository (`knowledge/CitationRepository.kt`)

Manages source citations and verification.

**Features:**
- SHA-256 integrity verification for verbatim excerpts
- Expiry date tracking for sources
- Links chunks to source documents and pages
- URL and edition metadata

#### 6. BundleManager (`sync/BundleManager.kt`)

Offline bundle management with signature verification.

**Bundle Format:**
- ZIP file containing:
  - `knowledge/index.json` - Chunk metadata and citations
  - `embeddings/vectors.bin` - Pre-computed 384-dim vectors
  - `formulary/formulary.json` - Drug reference data
  - `bundle.sig` - Ed25519 signature
  - `bundle.meta.json` - Metadata, version, checksums

**Key Methods:**
- `downloadBundle(remoteUrl, onProgress)` - Download with progress tracking
- `getBundleStatus()` - Check local bundle availability
- `verifyBundle()` - Signature verification
- `cleanupOldBundles()` - Storage quota management
- `getBundleMetadata()` - Access bundle info

**Features:**
- Resumable downloads
- Incomplete download cleanup
- Storage quota management (keep 2 latest versions)
- SHA-256 content hash validation

### UI Components

#### 1. DrugLookupScreen (`ui/drug/DrugLookupScreen.kt`)

Standalone drug lookup interface.

**Features:**
- Search by generic name, local name, or keyword
- Multi-language drug name display
- Complete dose information (dose, route, timing)
- Contraindications and warnings in red
- WHO EML badge
- Clinical status (VERIFIED/UNVERIFIED)
- Expiry date warning
- Source citation with link

**ViewModel:** `DrugLookupViewModel`
- Case-insensitive partial matching
- Language-aware name resolution using device locale
- Sorting by expiry, WHO listing, clinical status

#### 2. ClinicalChatScreen (`ui/chat/ClinicalChatScreen.kt`)

Specialized chat interface for clinical queries.

**Features:**
- Clinical query mode with specialization context
- Mode banner (Clinical/Pregnancy Care/Emergency) with disclaimers
- Citation display with tappable `[SRC:chunk_id]` tags
- Quick action buttons for emergency protocols:
  - Eclampsia Protocol
  - PPH Management
  - Drug Interactions
- Offline-accessible chat history
- Streaming responses with status indicators

**Emergency Protocol Quick Access:**
- Pre-loaded clinical protocols
- Triage guidance
- Medication reference cards
- Monitoring checklist

#### 3. Citation Drawer (`ui/chat/CitationDrawer.kt`)

Source citation display component (existing, used by both ChatScreen and ClinicalChatScreen).

**Shows:**
- Source document name, edition, section
- Page number
- Verbatimexcerpt from original
- Integrity verification status
- "Verify online" link
- Content hash and URL

### Clinical Protocols

#### ClinicalProtocols (`clinical/ClinicalProtocols.kt`)

Offline-accessible emergency management algorithms.

**Protocols Implemented:**

1. **Eclampsia Management Protocol** (`eclampsia-management`)
   - Immediate actions (airway, IV access, positioning)
   - First-line: Magnesium sulfate 4g IV loading + 1g/h maintenance
   - Antihypertensive: Labetalol 20-40mg IV titration
   - Triage assessment (RED/YELLOW/GREEN)
   - Monitoring: Vital signs, DTRs, urine output, coagulation
   - Complications: HELLP, DIC, cerebral hemorrhage, pulmonary edema
   - WHO reference: PCPNC 2023

2. **Postpartum Hemorrhage (PPH) Management Protocol** (`pph-management`)
   - Immediate actions (emergency alert, IV access, uterine massage)
   - Uterotonic ladder:
     - First-line: Oxytocin 10U IM/slow IV
     - Second-line: Ergotamine 0.5mg IM (if no hypertension)
     - Third-line: Misoprostol 800mcg
   - Tranexamic acid 1g IV (within 3 hours)
   - Triage assessment
   - Monitoring: Vital signs, uterine tone, fluid balance
   - Complications: DIC, shock, acute kidney injury
   - WHO reference: Essential Maternal Care

**Triage Classification:**
- RED (Critical): Life-threatening, immediate intervention
- YELLOW (Urgent): Potentially serious, within 30 minutes
- GREEN (Non-urgent): Minor conditions, can wait 2-4 hours

**Vital Sign Reference Cards:**
- Normal/warning/emergency thresholds for:
  - Systolic/Diastolic BP
  - Heart rate, respiratory rate
  - O2 saturation, temperature

## Search Patterns

### 1. Semantic Search (Vector Similarity)

```kotlin
val results = knowledgeRepository.searchClinical(
    query = "management of severe hypertension in pregnancy",
    topK = 5
)
// Returns top-5 most relevant chunks by embedding similarity
// Average latency: < 200ms, offline
```

### 2. Clinical Guideline Retrieval

```kotlin
val guidelines = knowledgeRepository.getClinicalGuidelines("eclampsia")
// Filters semantic results to contain "guideline", "management", or "protocol"
```

### 3. Drug Lookup

```kotlin
val drugInfo = knowledgeRepository.getDrugInfo("oxytocin")
// Returns: generic name, local names, dose, route, timing, 
//          contraindications, warnings, WHO EML status
```

### 4. Hybrid Search (Semantic + Keyword)

```kotlin
val results = knowledgeRepository.searchHybrid(
    query = "blood pressure management hypertension treatment",
    topK = 5,
    keywordWeight = 0.3f,
    semanticWeight = 0.7f
)
// Combines cosine similarity with BM25-style keyword relevance
```

### 5. Citation Resolution

```kotlin
val citations = knowledgeRepository.getCitations(chunkId)
// Returns: source document, section, page, verbatim excerpt, 
//          content hash, expiry date, URL
```

## Data Model

### KnowledgeChunk (Room Entity)

```kotlin
data class KnowledgeChunk(
    val chunkId: String,              // "PCPNC-2023-03-12"
    val docSlug: String,              // "who-pcpnc-2023"
    val chunkIndex: Int,              // Sequential position in document
    val content: String,              // Full chunk text
    val contentHash: String,          // SHA-256 for integrity
    val embedding: ByteArray,         // Float32LE, 384 dims × 4 bytes = 1536 bytes
    val sourceDocument: String,       // "WHO PCPNC 2023"
    val sourceEdition: String,        // "Revised 2023"
    val sourceSection: String,        // "Section 3.2: Eclampsia Management"
    val sourcePage: Int,              // 47
    val sourceUrl: String,            // Full URL to document
    val verbatimExcerpt: String,      // Exact original text
    val expiryDate: String?,          // ISO-8601, null = no expiry
    val language: String,             // BCP-47: "en", "my", "bn", etc.
    val ingestedAt: Long,             // Epoch millis when loaded
)
```

### FormularyEntry (Room Entity)

```kotlin
data class FormularyEntry(
    val drug: String,                 // "oxytocin"
    val genericName: String,          // "Oxytocin"
    val localNamesJson: String,       // {"my": "အောက်ကန်း", "id": "oksitosin"}
    val indication: String,           // "Prevention/management of PPH"
    val dose: String,                 // "10 units"
    val route: String,                // "IM | IV"
    val timing: String,               // "Within 1 minute of delivery"
    val alternativeDose: String?,     // "5 units IV slowly"
    val contraindicationsJson: String,// ["hypertension", "preeclampsia"]
    val warningsJson: String,         // ["Monitor BP", "IV must be slow"]
    val source: String,               // "WHO PCPNC 2023, Section 3.2, Page 47"
    val sourceChunkId: String,        // Link to knowledge chunk
    val sourceUrl: String,            // Full document URL
    val whoEmlListed: Boolean,        // true = on WHO Essential Medicines List
    val clinicalStatus: String,       // "VERIFIED" | "UNVERIFIED-SCAFFOLD"
    val reviewedBy: String?,          // Clinician name
    val reviewedAt: String?,          // ISO-8601 date
    val expiryDate: String?,          // Clinical information expiry
)
```

## Offline Capabilities

All functionality is fully offline-accessible after initial bundle download:

✅ Semantic search (no network required for embedding)
✅ Drug lookup and formulary access
✅ Clinical guideline retrieval
✅ Citation display and verification
✅ Emergency protocol access
✅ Triage assessment
✅ Citation integrity checking (SHA-256)

Network required only for:
- Initial bundle download
- Checking for bundle updates
- "Verify online" links in citations

## Performance Characteristics

| Operation | Latency | Offline | Notes |
|-----------|---------|---------|-------|
| Semantic search (top-5) | < 200ms | ✅ | Linear scan, 8000 chunks |
| Drug lookup | < 50ms | ✅ | Hash-based DB query |
| Clinical guideline filter | < 100ms | ✅ | Post-search keyword filter |
| Citation retrieval | < 10ms | ✅ | DB lookup |
| Bundle download (typical) | 2-5 min | ❌ | Depends on connection |
| Bundle extraction | 30-60s | N/A | ZIP extraction |

## Multi-Language Support

### Supported Languages

- English (en)
- Burmese (my)
- Bangla (bn)
- Khmer (km)
- Tamil (ta)
- Sinhalese (si)
- Dari (prs)
- Amharic (am)
- And 40+ others via paraphrase-multilingual-MiniLM-L12-v2

### Language-Specific Features

1. **Drug Names:** Stored in JSON with BCP-47 language codes
2. **Query Processing:** Automatic language detection and multilingual embedding
3. **UI Text:** Device locale-aware name resolution
4. **Clinical Guidelines:** Content available in original language with translation support

## Testing

Comprehensive test suites ensure:

### ClinicalSearchTest
- Semantic search functionality
- Clinical guideline retrieval
- Drug information lookup
- Citation retrieval
- Hybrid search accuracy
- Vertical filtering
- Offline accessibility
- Empty query handling
- Performance benchmarks (< 1 second)
- Multilingual query support

### DrugLookupTest
- Case-insensitive lookups
- Partial name matching
- Multi-language drug names
- Contraindications/warnings parsing
- WHO EML verification
- Clinical status validation
- Expiry date handling
- Source citation verification
- Offline access
- Bulk drug retrieval performance

### OfflineAccessTest
- All chunks available offline (> 100 chunks)
- All drugs available offline (> 20 drugs)
- Semantic search without network
- Drug lookup without network
- Citation availability
- Bundle status tracking
- Guideline retrieval for key conditions
- Hybrid search offline
- Vertical filtering offline
- Search latency < 500ms average
- Data consistency validation
- Knowledge base coverage (key conditions)

## Implementation Checklist

✅ KnowledgeRepository enhancements
✅ DrugLookupScreen UI component
✅ DrugLookupViewModel
✅ ClinicalChatScreen with protocols
✅ ClinicalProtocols (eclampsia, PPH)
✅ BundleManager for offline bundles
✅ EmbeddingEngine vector search enhancements
✅ VectorSearch similarity search enhancements
✅ Comprehensive unit and integration tests
✅ Offline accessibility verification
✅ Performance benchmarking
✅ Multi-language support validation

## Future Enhancements

1. **Approximate Nearest Neighbor Search**
   - Implement LSH (Locality-Sensitive Hashing) for faster searches
   - Or HNSW (Hierarchical Navigable Small World graphs)
   - Target: < 50ms search latency at 50K+ chunks

2. **Advanced Clinical Protocols**
   - Add more emergency algorithms (sepsis, anemia, etc.)
   - Interactive decision trees
   - Risk stratification tools

3. **RAG Integration with Gemma**
   - Use retrieved chunks as context for LLM responses
   - Prevent hallucination with grounding
   - Citation tracking in AI responses

4. **Dose Calculator**
   - Interactive drug dosing based on patient weight/age
   - Drug interaction checker
   - Renal/hepatic dose adjustments

5. **Offline Bundle Sync**
   - Automatic bundle updates on WiFi
   - Incremental updates (only changed content)
   - Version tracking and rollback support

6. **Knowledge Analytics**
   - Track which guidelines are most accessed
   - Search term analysis
   - Clinical decision support improvement

## References

- WHO Essential Maternal Care Guidelines (2023)
- UNFPA Protocols for Safe Maternal Care
- Clinical Evidence Base for Emergency Obstetrics
- Paraphrase MiniLM Embeddings Model (HuggingFace)
- ONNX Runtime for Mobile (Android)

## Support & Troubleshooting

See `docs/TROUBLESHOOTING.md` for:
- Bundle download issues
- Offline access problems
- Search performance degradation
- Language/locale issues
- Citation verification failures
