# Agent Coordination Document

**Coordination Type**: Multi-agent parallel development with dependency management
**Project**: UNFPA OTG Clinical Knowledge Base Build-Out
**Start Time**: 2026-04-10 14:40 UTC
**Target Completion**: 2026-04-10 18:00 UTC (parallel execution)

## Agent Status Dashboard

### Agent 1: Clinical Documents & Ingestion Pipeline
**ID**: ae4c6bc5cc92a49a8
**Status**: 🔄 In Progress
**Estimated Completion**: +120 minutes
**Deliverables**:
- WHO clinical guideline JSONL documents
- UNFPA protocol documents  
- Metadata files (.meta.json)
- Validation script
- Clinical KB documentation

**Dependencies**:
- ✅ Formulary.json (ready)
- ✅ clinicalChunkingService.ts (ready)
- ✅ ingest-clinical.ts script (ready)

**Blocking Issues**: None expected

---

### Agent 2: Web App Clinical Integration
**ID**: ab99bd66c425fa5d0
**Status**: 🔄 In Progress
**Estimated Completion**: +150 minutes
**Deliverables**:
- Clinical chat page & components
- Clinical search API endpoint
- Clinical formulary API endpoint
- Clinical guidelines API endpoint
- Clinical RAG service
- Citation & dose calculator components

**Dependencies**:
- ✅ embeddingService.ts (ready)
- ✅ knowledgeDocumentService.ts (ready)
- ⏳ Clinical documents from Agent 1 (needed for testing)
- ✅ Prisma schema (ready)

**Notes**: Can proceed with mock data; will integrate real documents once Agent 1 completes

**Blocking Issues**: None expected

---

### Agent 3: Mobile Content Bundle System
**ID**: a51e31b7915d71d07
**Status**: 🔄 In Progress
**Estimated Completion**: +180 minutes
**Deliverables**:
- build-mobile-bundle.ts script
- Bundle publisher service
- Bundle API endpoint
- Bundle validation script
- MOBILE_BUNDLES.md documentation

**Dependencies**:
- ✅ Formulary data (ready)
- ⏳ Clinical documents from Agent 1 (needed for bundle content)
- ✅ database schema (ready)

**Notes**: Will create initial bundle with formulary; document sources can be added incrementally

**Blocking Issues**: None expected

---

### Agent 4: Android Clinical Integration
**ID**: ac919ed4636dd960f
**Status**: 🔄 In Progress
**Estimated Completion**: +150 minutes
**Deliverables**:
- Enhanced KnowledgeRepository
- ClinicalChatScreen
- DrugLookupScreen
- ClinicalProtocols component
- Enhanced EmbeddingEngine
- BundleManager
- Clinical feature tests

**Dependencies**:
- ✅ Existing Android architecture (ready)
- ⏳ Mobile bundle system from Agent 3 (needed for bundle download)
- ✅ Formulary data (ready)

**Notes**: Can proceed with mock data; full integration when Agent 3 completes

**Blocking Issues**: None expected

---

### Agent 5: iOS App Scaffolding
**ID**: a16c8e2e82795f9b8
**Status**: 🔄 In Progress
**Estimated Completion**: +180 minutes
**Deliverables**:
- iOS project structure (SwiftUI)
- Core Data models
- Knowledge service
- Bundle service
- Sync service
- Clinical UI screens
- iOS README

**Dependencies**:
- ✅ Android architecture as reference (ready)
- ⏳ Mobile bundle system from Agent 3 (for integration)
- ✅ Formulary data (ready)

**Notes**: Can proceed with empty bundle; full data integration later

**Blocking Issues**: None expected

---

## Integration Plan

### Timeline

**T+0 to T+120 min**: All agents working in parallel
- Agent 1: Creating clinical documents
- Agent 2: Building web app APIs with mock data
- Agent 3: Building bundle system
- Agent 4: Building Android components with mock data
- Agent 5: Scaffolding iOS app

**T+120 min (check 1)**: Agent 1 completes
- Clinical documents ready
- Validation script ready
- Agents 2, 3, 4 integrate real documents

**T+150 min (check 2)**: Agents 2 & 4 complete
- Web app APIs fully integrated
- Android app ready for bundle testing
- Remaining work: bundle creation & testing

**T+180 min (final)**: All agents complete
- All code ready for testing
- Documentation complete
- Bundles can be created
- Ready for integration testing

### Merge Strategy

```
claude/android-ai-local-llm-ywElz (current branch)
├── Agent 1: Clinical documents + validation
├── Agent 2: Web app clinical integration
├── Agent 3: Bundle system
├── Agent 4: Android integration
└── Agent 5: iOS scaffolding
      ↓
     All merged together
      ↓
   Integration testing
      ↓
   Create first bundle
      ↓
   Test on Android/iOS
      ↓
   Ready for main branch PR
```

## Conflict Resolution

### No Expected Conflicts Because:
- **Agent 1** only creates new files in `docs/knowledge-base/`
- **Agent 2** only modifies `next-app/` directory
- **Agent 3** creates new scripts and services in `next-app/`
- **Agent 4** only modifies `android/` directory  
- **Agent 5** creates new `ios/` directory

### If Conflicts Occur:
1. File-level conflicts: Agents notify main coordinator
2. Dependency conflicts: Use mock data approach
3. API contracts: Documented in IMPLEMENTATION_GUIDELINES.md

## Monitoring Commands

```bash
# Check agent progress
tail -100 /tmp/claude-0/-home-user-unfpa-lkyspp-otg/.../tasks/ae4c6bc5cc92a49a8.output

# Check what files have been created
git status --porcelain

# Check commits
git log --oneline --all -20

# List all changes
git diff --name-status origin/main..HEAD
```

## Coordination Checkpoints

### Checkpoint 1: T+120 min
- [ ] Agent 1 completes and pushes clinical documents
- [ ] Agents 2-5 have scaffolding complete
- [ ] No merge conflicts
- Action: Integrate Agent 1 output into other agents

### Checkpoint 2: T+150 min
- [ ] Agents 2 & 4 integrate real clinical data
- [ ] Web app APIs tested with mock data
- [ ] Android components tested with mock data
- Action: Begin bundle creation

### Checkpoint 3: T+180 min
- [ ] All agents complete
- [ ] All code reviewed
- [ ] Documentation complete
- Action: Merge and test

### Final Checkpoint: T+220 min
- [ ] Integration testing complete
- [ ] Bundle creation successful
- [ ] Cross-platform testing passes
- [ ] Ready to push to main

## Success Criteria

✅ All agents complete on time
✅ No merge conflicts
✅ All deliverables meet requirements
✅ Documentation complete
✅ Ready for production testing
✅ No technical debt introduced

## Communication Protocol

**Status Updates**: Every 30 minutes via agent output
**Blocking Issues**: Escalate immediately
**Completion**: Final merge coordination when all agents done

---

**Coordinator**: Claude Code Agent Orchestration
**Last Updated**: 2026-04-10T14:40:00Z
**Status**: All agents active - parallel execution in progress
