# UNFPA OTG Clinical Knowledge Base Build Plan

**Status**: In Progress (5 parallel work streams)
**Branch**: `claude/android-ai-local-llm-ywElz`
**Target Completion**: Complete integrated system with web, Android, and iOS apps

## Overview

This document outlines the comprehensive build-out of the clinical knowledge base across all platforms, following the work from the merged PR #20 and #21.

## Completed Work

✅ **Formulary Expansion** (Commit fc8d5a7)
- Expanded from 5 to 32 essential reproductive health drugs
- Added WHO EML citations and UNFPA guidance references
- Included contraindications, dosing, routes, multilingual names
- Categories: maternal health, family planning, STI treatment, antenatal, newborn, supportive

## In-Progress Work Streams

### 1. Clinical Document Sources & Ingestion Pipeline
**Agent**: ae4c6bc5cc92a49a8
**Deliverables**:
- WHO clinical guideline documents (JSONL format)
- UNFPA protocol documents
- Metadata files with citations
- Validation script for clinical sources
- Documentation on ingestion workflow

**Files affected**:
- `docs/knowledge-base/clinical/*.json`
- `docs/knowledge-base/clinical/*.meta.json`
- `scripts/validate-clinical-sources.ts`
- `docs/CLINICAL_KNOWLEDGE_BASE.md` (new)

### 2. Web App Clinical Integration
**Agent**: ab99bd66c425fa5d0
**Deliverables**:
- Clinical chat interface (`next-app/app/clinical-chat/page.tsx`)
- Clinical knowledge API endpoints:
  - `/api/clinical/search`
  - `/api/clinical/formulary`
  - `/api/clinical/guidelines`
- Clinical RAG service (`next-app/services/clinicalRagService.ts`)
- UI components:
  - Citation drawer
  - Drug lookup
  - Dose calculator
  - Evidence badges

**Files affected**:
- `next-app/app/clinical-chat/page.tsx` (new)
- `next-app/services/clinicalRagService.ts` (new)
- `next-app/components/clinical-*.tsx` (new)
- `next-app/app/api/clinical/*.ts` (new)

### 3. Mobile Content Bundle System
**Agent**: a51e31b7915d71d07
**Deliverables**:
- Bundle creation script (`scripts/build-mobile-bundle.ts`)
- Bundle manifest schema
- Bundle publisher service
- Bundle validation script
- API endpoint for bundle delivery (`/api/mobile/bundle/latest`)
- Documentation on bundle management

**Files affected**:
- `scripts/build-mobile-bundle.ts` (new)
- `next-app/services/bundlePublisher.ts` (new)
- `next-app/app/api/mobile/bundle/latest/route.ts` (new)
- `docs/MOBILE_BUNDLES.md` (new)

### 4. Android Clinical Integration
**Agent**: ac919ed4636dd960f
**Deliverables**:
- Enhanced KnowledgeRepository with clinical search methods
- Clinical chat screen (`android/.../ui/chat/ClinicalChatScreen.kt`)
- Drug lookup screen (`android/.../ui/drug/DrugLookupScreen.kt`)
- Clinical protocols component
- Enhanced EmbeddingEngine for semantic search
- Bundle manager for offline content
- Tests for clinical features

**Files affected**:
- `android/app/src/main/java/org/unfpa/otg/knowledge/KnowledgeRepository.kt` (enhanced)
- `android/app/src/main/java/org/unfpa/otg/ui/chat/ClinicalChatScreen.kt` (new)
- `android/app/src/main/java/org/unfpa/otg/ui/drug/DrugLookupScreen.kt` (new)
- `android/app/src/main/java/org/unfpa/otg/clinical/ClinicalProtocols.kt` (new)

### 5. iOS App Scaffolding
**Agent**: a16c8e2e82795f9b8
**Deliverables**:
- iOS project structure with SwiftUI
- Core Data models mirroring Android
- Knowledge, Bundle, and Sync services
- Clinical UI screens (chat, drug lookup, protocols)
- Local database with encryption
- Bundle downloading and verification
- Documentation

**Files affected**:
- `ios/` (new directory)
- `ios/OTG/Models/*.swift`
- `ios/OTG/Services/*.swift`
- `ios/OTG/Views/*.swift`
- `ios/OTG/Database/*.swift`
- `ios/OTG/Clinical/*.swift`
- `ios/README.md` (new)

## Architecture Overview

### Database Schema
```
KnowledgeDocument (knowledge_documents)
├── id, vertical, title, slug, content, wordCount, metadata, version
├── KnowledgeChunk (knowledge_chunks) [1-to-many]
│   ├── id, documentId, chunkIndex, content, tokenCount, embedding
│   ├── sourceDocument, sourceEdition, sourceSection, sourcePage, sourceUrl
│   └── contentHash, expiryDate, clinicalSourceId

ClinicalSource (clinical_sources)
├── id, slug, title, edition, pubYear, sha256, redistributionOk
├── clinicalReviewer, reviewedAt, expiryDate, vertical

FormularyEntry (formulary_entries)
├── id, drug, localNames, indication, dose, route, timing
├── contraindications, warnings, source, sourceChunkId
└── whoEmlListed, reviewedBy, reviewedAt, expiryDate

MobileContentBundle (mobile_content_bundles)
├── id, version, manifest (JSON), signature (Ed25519)
└── publishedAt, publishedBy, notes
```

### API Endpoints

#### Web App
- `POST /api/clinical/search` - Vector semantic search
- `GET /api/clinical/formulary?drug=...` - Drug lookup
- `GET /api/clinical/guidelines?condition=...` - Guideline retrieval
- `POST /api/clinical/citations` - Citation retrieval

#### Mobile
- `GET /api/mobile/bundle/latest` - Download latest bundle
- `GET /api/mobile/bundle/{version}` - Download specific version
- `POST /api/mobile/bundle/verify` - Verify signature (for testing)

### Offline Architecture

**Android/iOS Bundle Contents**:
```
bundle-2026.04.15.zip (signed with Ed25519)
├── manifest.json (list of documents, hashes, embeddings)
├── clinical-documents/ (chunked JSONL)
├── formulary.json (all drug entries)
├── embeddings/ (vector files, optional)
└── metadata/ (source info, citations)
```

**On-Device Database**:
- SQLite with encryption
- Full-text search for keywords
- Vector similarity search (approximate)
- Offline-first with periodic sync

## Integration Points

### Web App → Mobile
- Bundle generation and signing
- Version management and rollout
- Signature verification
- Content updates and deltas

### Mobile Apps → Web App
- Analytics on offline usage
- Sync status reporting
- Error reporting from bundle extraction

### Across Platforms
- Shared database schema
- Same clinical content and citations
- Unified drug formulary
- Consistent UI/UX patterns

## Testing Strategy

### Unit Tests
- Clinical chunking (table/list preservation)
- Citation metadata validation
- Bundle signature verification
- Semantic search accuracy

### Integration Tests
- End-to-end bundle creation and deployment
- Web app clinical chat accuracy
- Android/iOS offline access
- Cross-platform consistency

### Clinical Validation
- Medical accuracy of content
- Citation traceability
- Dose calculation accuracy
- Drug interaction checking

## Deployment Strategy

### Phase 1: Web App (Week 1-2)
- Deploy clinical chat interface
- Launch formulary search
- Test clinical RAG with real data

### Phase 2: Mobile Content (Week 2-3)
- Create and sign first bundle (2026.04.15)
- Deploy bundle endpoint
- Test Android bundle download

### Phase 3: Mobile Apps (Week 3-4)
- Release Android clinical features
- Beta test offline functionality
- Prepare iOS for App Store

### Phase 4: Refinement & Launch (Week 4-5)
- User testing and feedback
- Performance optimization
- Security audit
- Public launch

## Next Steps (Post-Agents)

1. **Merge and test** all agent work
2. **Run bundle creation** for first time
3. **Test mobile deployment** on Android
4. **Cross-platform validation** of clinical content
5. **Performance benchmarking** and optimization
6. **Documentation finalization** and deployment guides

## Success Criteria

✅ All 32 drugs in formulary are searchable offline on mobile
✅ Clinical PDFs are properly chunked with intact tables/lists
✅ Citations are verifiable and traceable to source documents
✅ Bundle generation is deterministic and reproducible
✅ Web app clinical chat provides accurate, cited responses
✅ Android app has full offline clinical knowledge access
✅ iOS app provides feature parity with Android
✅ All platforms support 5+ languages
✅ Zero data loss in offline mode
✅ Sub-second search performance on mobile

---

**Managed by**: Claude Code Agent Orchestration
**Last Updated**: 2026-04-10
**Status**: In Progress
