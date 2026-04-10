# iOS App Architecture

## Overview

The OTG iOS application follows the same clinical architecture as the Android version, providing offline-first access to evidence-based clinical guidance for maternal and child health.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SwiftUI UI Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  ChatView    │  │ DrugLookup   │  │ Protocols    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ KnowledgeService │  │  BundleService  │ SyncService│ │
│  └──────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Core Data + SQLite Database               │   │
│  │  • KnowledgeChunkEntity                          │   │
│  │  • KnowledgeDocEntity                            │   │
│  │  • FormularyEntryEntity                          │   │
│  │  • AuditLogEntity                                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              External Services                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  Network Stack   │  │  File System                  │ │
│  │  (URLSession)    │  │  Bundle Resources            │ │
│  └──────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### Presentation Layer (SwiftUI)

**Views** (`OTG/Views/`)
- `ChatView`: Clinical knowledge search interface
- `DrugLookupView`: Drug formulary browser with dose calculations
- `ClinicalProtocolsView`: Emergency protocols and guidelines
- `OfflineIndicatorView`: Connectivity and sync status display
- `App.swift`: Main app entry point with tab navigation

**Key Properties:**
- SwiftUI-first (iOS 15+)
- Observable objects for reactive updates
- Dark mode support
- Accessibility compliance (WCAG 2.1 AA)

### Service Layer

**KnowledgeService** (`Services/KnowledgeService.swift`)
- Semantic search with vector similarity
- Knowledge base initialization from bundles
- Document and chunk retrieval
- Filtering by vertical/category

**BundleService** (`Services/BundleService.swift`)
- Download content bundles from server
- Ed25519 signature verification
- SHA-256 hash validation
- Atomic bundle application

**SyncService** (`Services/SyncService.swift`)
- Background task scheduling
- Manifest verification
- Incremental content updates
- Network monitoring

**EmbeddingService** (`Services/EmbeddingService.swift`)
- Text-to-vector conversion (384-dimensional)
- Batch embedding operations
- Seeded random generation for reproducibility

### Data Layer

**OTGDatabase** (`Database/OTGDatabase.swift`)
- Core Data singleton manager
- SQLite persistence backend
- CRUD operations for all entities
- Batch upsert transactions

**Core Data Schema** (`Database/OTG.xcdatamodeld/`)
```
KnowledgeDocEntity (1)──────────(N) KnowledgeChunkEntity
- slug (unique)                       - chunkId (unique)
- title                               - docSlug (foreign key)
- vertical                            - content
- contentHash                         - embedding (binary)
- sourceUrl                           - sourceDocument
- language                            - sourcePage
- ingestedAt                          - verbatimExcerpt
                                      - language
                                      - ingestedAt

FormularyEntryEntity                 AuditLogEntity
- drug (unique)                      - answeredAt
- genericName                        - chunkIds (JSON)
- localNamesJson (JSON)              - query
- indication                         - response
- dose                               - mode
- route                              - language
- timing                             - userId
- contraindications (JSON)
- warnings (JSON)
- whoEmlListed
- clinicalStatus
- source/sourceChunkId
- expiryDate

ClinicalSourceEntity
- sourceId (unique)
- sourceDocument
- sourceUrl
- organization
- verifiedAt
- expiryDate
```

### Models

**Knowledge Models** (`Models/`)
- `KnowledgeChunk`: Semantic chunk with embedding (384-dim vector)
- `KnowledgeDoc`: Document metadata with vertical classification
- `FormularyEntry`: Drug database with dosing and safety info
- `ClinicalSource`: Citation tracking and source verification
- `AuditLogEntry`: Query logging for compliance

**Clinical Models** (`Clinical/`)
- `ClinicalProtocol`: Emergency protocols with step-by-step guidance
- `ClinicalGuideline`: Evidence-based guidelines with citations
- `DrugProtocol`: Drug-specific protocols with contraindications
- `DoseCalculation`: Pediatric dose calculation helpers

### Utilities

**LocalizationManager** (`Utilities/LocalizationManager.swift`)
- 6-language support: en, sw (Swahili), am (Amharic), fr, ti (Tigrinya), so (Somali)
- Automatic system language detection
- Date/number formatting per language

**AccessibilityHelper** (`Utilities/AccessibilityHelper.swift`)
- VoiceOver support
- Semantic labels on all interactive elements
- 44pt minimum touch target size
- Keyboard navigation support

**NetworkMonitor** (`Views/OfflineIndicatorView.swift`)
- Real-time connectivity monitoring
- Background task awareness
- Graceful offline fallback

## Data Flow

### 1. Search Flow
```
User Query (ChatView)
    ↓
KnowledgeService.search()
    ↓
EmbeddingService.embed(query)  ← Generate 384-dim vector
    ↓
Vector similarity search        ← Cosine similarity on all chunks
    ↓
Filter by vertical/category
    ↓
Rank by score (top K)
    ↓
Convert to SearchResult
    ↓
Display in ChatView with citations
```

### 2. Bundle Sync Flow
```
Background Task (every 12 hours)
    ↓
SyncService.sync()
    ↓
BundleService.fetchLatestManifest()  ← Check server
    ↓
SignatureVerifier.verify()           ← Ed25519 verification
    ↓
For each doc:
  - Download from URL
  - Verify SHA-256 hash
  - Delete old chunks
  - Insert new chunks
    ↓
Update lastSyncDate
    ↓
NotifyUI of completion
```

### 3. Initialization Flow
```
App Launch
    ↓
OTGDatabase.init()              ← Load Core Data stack
    ↓
KnowledgeService.initialize()
    ↓
Load knowledge/index.json       ← From app bundle
    ↓
Load embeddings/vectors.bin     ← Binary vector data
    ↓
Populate Core Data database
    ↓
Cache in memory for fast search
    ↓
UI is ready
```

## Key Design Patterns

### 1. Observable Objects
Services use `@ObservableObject` for reactive updates:
```swift
@StateObject var knowledgeService = KnowledgeService()
@Published var searchResults: [KnowledgeSearchResult] = []
@Published var isSearching = false
```

### 2. Async/Await
All async operations use Swift Concurrency:
```swift
Task {
    await knowledgeService.search(query: text)
}
```

### 3. Database Transaction
Core Data transactions for atomic updates:
```swift
let context = database.viewContext
// Make changes
try context.save()
```

### 4. Dependency Injection
Services accept dependencies:
```swift
init(database: OTGDatabase = .shared)
```

## Database Schema Design

### Relationships
- KnowledgeDoc → KnowledgeChunk (1:N with cascade delete)
- Formulary entries are independent
- Audit logs are append-only

### Indexes
```sql
CREATE INDEX idx_knowledge_chunks_docSlug ON knowledge_chunks(docSlug)
CREATE INDEX idx_formulary_entries_drug ON formulary_entries(drug)
CREATE UNIQUE INDEX idx_knowledge_docs_slug ON knowledge_docs(slug)
```

### Data Sizes
- Typical chunk size: 500-1000 characters
- Embedding size: 384 floats × 4 bytes = 1536 bytes per chunk
- Formulary entry: ~2KB per drug
- Total for reference bundle: ~500MB

## Security

### Signature Verification
- Ed25519 signatures on all bundles
- Public key bundled in app resources
- Invalid signatures silently rejected
- No automatic downgrade to unsigned

### Encryption
- Core Data encryption at rest (SQLite)
- HTTPS for all network calls
- Keychain storage for sensitive credentials
- No sensitive data in logs

## Performance Optimizations

### Vector Search
- Pre-computed embeddings (loaded from binary file)
- Cosine similarity with SIMD optimization
- Approximate search for large datasets
- Results caching

### Database
- Indexed queries on slug, docSlug
- Lazy loading of chunks
- Batch upsert operations
- SQLite connection pooling

### Network
- URL session with background configuration
- Incremental content updates
- Resumable downloads
- Compression support

## Testing Strategy

### Unit Tests
- Vector similarity calculations
- Dose calculations
- Data model conversions
- LocalizationManager

### Integration Tests
- Database CRUD operations
- Bundle download and verification
- Search across knowledge base
- Sync workflow

### UI Tests
- Search result display
- Navigation flow
- Accessibility features
- Offline functionality

## Deployment

### Build Configuration
```
Development:
- DEBUG=1
- Verbose logging
- No code signing

Release:
- OPTIMIZE_FOR_SIZE
- Strip debug symbols
- Code signing required
```

### Version Management
- Marketing Version: 1.0.0
- Build Version: 1
- iOS Minimum: 15.0

## Future Enhancements

1. **Enhanced Embeddings**
   - On-device embedding model
   - Real-time embedding generation
   - Multi-modal embeddings

2. **Advanced Search**
   - Semantic search with re-ranking
   - Filters and faceted search
   - Search history and favorites

3. **Clinical Features**
   - Clinical note taking
   - Patient case tracking
   - Offline form filling

4. **Synchronization**
   - Bi-directional sync
   - Conflict resolution
   - Data compression

5. **Analytics**
   - Usage analytics
   - Performance monitoring
   - Crash reporting

## Related Documentation

- [README.md](README.md) - Project overview and setup
- [Android Architecture](../android/ARCHITECTURE.md) - Android implementation
- [Clinical Knowledge Base](../docs/CLINICAL_KNOWLEDGE_BASE.md) - Data model

## Contributing

Please follow these architectural guidelines:
1. Services for business logic
2. Models for data representation
3. Views for UI
4. Utilities for shared functionality
5. Clinical folder for clinical-specific code

One file per entity/service. Use proper error handling with Result types. Add comprehensive documentation.
