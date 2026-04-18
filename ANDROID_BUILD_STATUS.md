# Android Build Status & Play Store Roadmap

**Last audited**: 2026-04-18  
**Audited by**: Shera (via Claude Code)

---

## 1. Build Completeness

### What is genuinely implemented (not stubs)

| Component | File(s) | Notes |
|-----------|---------|-------|
| Gradle build system | `android/gradle/libs.versions.toml`, `app/build.gradle.kts` | AGP 8.7.3, Kotlin 2.3.20, Compose BOM 2026.03.00 — compiles |
| Local LLM inference | `ai/GemmaEngine.kt` | Real MediaPipe LiteRT-LM wrapper, streaming + blocking, GPU fallback |
| On-device embeddings | `knowledge/EmbeddingEngine.kt` | Real ONNX Runtime, WordPiece tokenizer, mean-pool, L2-norm, vector search |
| Agentic loop | `ai/AgentOrchestrator.kt` | Full 3-round tool-use loop ported from Next.js `route.ts` |
| Room database | `db/AppDatabase.kt` | 4 entities (KnowledgeDoc, KnowledgeChunk, FormularyEntry, AuditLog), all DAOs complete |
| Navigation / UI shell | `MainActivity.kt` | Full NavHost with all screens wired |
| Chat state management | `ui/chat/ChatViewModel.kt` | Proper coroutines, StateFlow, init flow |
| Knowledge tool execution | `ai/ToolExecutor.kt` | Routes tool calls to KnowledgeRepository |
| OTA content sync | `sync/KnowledgeSyncWorker.kt` | WorkManager + OkHttp, SHA-256 verification, Wi-Fi only |
| All UI screens | `ui/chat/`, `ui/drug/`, `ui/export/`, `ui/knowledge/`, `ui/onboarding/`, `ui/settings/` | All screens exist |
| AndroidManifest | `AndroidManifest.xml` | All permissions declared, RTL support, large heap |
| Launcher icons | `res/mipmap-*/` | All densities present |

---

## 2. Code Gaps (must fix before Play Store)

### HIGH — breaks core functionality

**A. Missing embedding vocab file**
- `EmbeddingEngine.kt` expects: `assets/models/multilingual-minilm-vocab.txt`
- The `assets/` directory does not exist in the repo
- Without it, `loadVocab()` returns an empty map → every token becomes `[UNK]` → semantic search is broken silently
- **Fix**: Export the vocab from HuggingFace `paraphrase-multilingual-MiniLM-L12-v2` and add to `android/app/src/main/assets/models/multilingual-minilm-vocab.txt`

**B. Model download not wired up**
- `MainActivity.kt` line ~75: `onStartDownload = { variant -> /* TODO: start download via DownloadManager */ }`
- Users have no way to download the Gemma 4 model in-app
- **Fix**: Implement a `ModelDownloadViewModel` that uses Android `DownloadManager` to fetch `gemma4-e2b-int4.litertlm` from your CDN/Supabase storage bucket, with progress reporting to `ModelDownloadScreen`

### MEDIUM — screens show no data

**C. KB Browser hardcoded to empty list**
- `MainActivity.kt` line ~88: `docs = emptyList()`
- **Fix**: Create `KBBrowserViewModel` backed by `KnowledgeRepository`, pass docs to screen

**D. Doc Detail hardcoded to "Loading…"**
- `MainActivity.kt` line ~96: `markdownContent = "Loading…"`
- **Fix**: Load markdown content from `KnowledgeChunkDao.getChunkIdsByDoc()` in a ViewModel

---

## 3. Dependency Updates (2026-04-18)

### Updated in this session

| Library | Old | New |
|---------|-----|-----|
| Kotlin | 2.1.0 | 2.3.20 |
| KSP | 2.1.0-1.0.29 | 2.3.20-1.0.29 |
| Compose BOM | 2024.12.01 | 2026.03.00 |
| Activity Compose | 1.9.3 | 1.13.0 |
| Navigation Compose | 2.8.5 | 2.9.7 |
| Lifecycle ViewModel | 2.8.7 | 2.9.0 |
| Lifecycle Runtime | 2.8.7 | 2.9.0 |
| WorkManager | 2.10.0 | 2.11.2 |
| kotlinx-Coroutines | 1.9.0 | 1.10.2 |
| kotlinx-Serialization | 1.7.3 | 1.11.0 |
| ONNX Runtime | 1.20.0 | 1.24.4 |
| iText7 | 7.2.6 | 7.3.0 |
| Supabase BOM | 3.0.3 | 3.5.0 |
| Ktor Client Android | 3.0.3 | 3.4.2 |
| Gradle wrapper | 8.9 | 8.10 |

### Pending — breaking major versions (separate PRs required)

| Library | Current | Target | Why it needs its own PR |
|---------|---------|--------|------------------------|
| AGP | 8.7.3 | 9.1.0 | Major version — build script changes, min Gradle version bump |
| Room | 2.6.1 | 3.0 | Major version — requires migration guide, `@ProvidedTypeConverters` changes |
| OkHttp | 4.12.0 | 5.x | Breaking API — `KnowledgeSyncWorker` needs rewrite for new call patterns |

---

## 4. Play Store Checklist

### Step 1 — Fix code gaps above (section 2)

### Step 2 — Generate release keystore
```bash
keytool -genkey -v -keystore unfpa-otg-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias unfpa-otg
```
Fill in `android/keystore.properties` (template already in repo).  
**Never commit the `.jks` or `keystore.properties`** — already git-ignored.

### Step 3 — Re-enable minification
In `android/app/build.gradle.kts`:
```kotlin
isMinifyEnabled = true
isShrinkResources = true
```
`proguard-rules.pro` already has keep rules from earlier work — validate they cover Apache POI and iText7 fully. Previous commits (`26cdf15`, `2d437ef`, `45bfaab`) show ProGuard was actively worked on; review those before re-enabling.

### Step 4 — Build release AAB
```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### Step 5 — Google Play Console
1. Create developer account at https://play.google.com/console ($25 one-time fee)
2. Create new app → package name: `org.unfpa.otg`
3. Store listing:
   - Title, short description (80 chars max), full description
   - Screenshots: phone (min 2), 7" tablet recommended
   - Feature graphic: 1024×500 px
   - Hi-res icon: 512×512 px
4. Content rating questionnaire → select Medical / Health
5. Data safety form — disclose:
   - No personal data collected
   - Network access: yes (OTA sync to Supabase)
   - Data stored locally: yes (Room DB, model files)
6. Upload `.aab` → start on **Internal Testing** track, not Production

### Step 6 — Health app policy
This is a **clinical decision-support tool** for healthcare workers. Google will review under their Health & Fitness policy:
- Add a store listing disclaimer: "For use by trained healthcare workers only. Not for general public self-diagnosis."
- Consider restricting distribution to specific countries (UNFPA deployment regions)
- May require a healthcare professional declaration

### Step 7 — Promote to Production
Only after:
- [ ] Code gaps A–D fixed and tested on a physical device
- [ ] Model download flow working end-to-end
- [ ] Vocab file present and embeddings verified (spot-check: same query returns relevant results)
- [ ] Release APK tested (not just debug)
- [ ] ProGuard/R8 validated — Apache POI and iText7 are known to break with minification
- [ ] OTA sync tested (Supabase → device, Wi-Fi only constraint confirmed)
- [ ] Internal testers in at least 2 countries have confirmed offline functionality

---

## 5. Model Files (not in repo — must be provided separately)

| File | Size (approx) | Where to get |
|------|--------------|--------------|
| `gemma4-e2b-int4.litertlm` | ~1.5 GB | Google AI / Kaggle (Gemma 4 E2B int4 LiteRT export) |
| `multilingual-minilm.onnx` | ~480 MB | HuggingFace: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` → ONNX export |
| `multilingual-minilm-vocab.txt` | ~1 MB | Same HuggingFace model repo |

Both model files go to: `Android/data/org.unfpa.otg/files/models/` on the device (external files dir).  
Vocab file goes to: `android/app/src/main/assets/models/` in the repo.
