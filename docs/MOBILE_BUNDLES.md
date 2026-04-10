# Mobile Content Bundles

Offline-first content distribution system for mobile apps (Android, iOS). Enables healthcare workers in low-connectivity areas to access clinical knowledge, formulary data, and local LLM embeddings without internet.

## Table of Contents

- [Overview](#overview)
- [Bundle Creation Workflow](#bundle-creation-workflow)
- [Version Management Strategy](#version-management-strategy)
- [Bundle Manifest Structure](#bundle-manifest-structure)
- [Mobile Bundle Consumption](#mobile-bundle-consumption)
- [Offline Content Structure on Device](#offline-content-structure-on-device)
- [Update Frequency & Rollout](#update-frequency--rollout)
- [Security & Verification](#security--verification)
- [Troubleshooting](#troubleshooting)

## Overview

### What is a Mobile Bundle?

A mobile bundle is a self-contained, cryptographically signed package containing:

1. **Clinical Documents** — All knowledge documents with full content
2. **Formulary Entries** — Drug/medicine database with local language names and dosages
3. **Embeddings** — Vector embeddings for semantic search (1536-dimensional, OpenAI model)
4. **Manifest** — JSON metadata describing all contents with SHA-256 hashes

### Key Properties

- **Deterministic** — Same content always produces the same hash/signature
- **Signed** — Ed25519 signature verified on every mobile app load
- **Compressed** — gzip compression reduces size ~60-80% for transmission
- **Versioned** — Date-based versions (YYYY.MM.DD) allow concurrent versions
- **Auditable** — Published-by and timestamp metadata for governance

### Typical Size

- Uncompressed: 50-100 MB (depending on clinical content)
- Compressed: 10-20 MB (over-the-air transmission)
- On-device: 50-100 MB after extraction

### Use Cases

1. **Initial App Installation** — Bundle embedded in app APK/IPA
2. **Over-The-Air Updates** — Mobile app periodically checks for new versions
3. **Offline Work** — Healthcare workers use locally-stored content
4. **Regional Rollouts** — Gradual rollout with canary versions (Phase 2)

## Bundle Creation Workflow

### Step 1: Collect Content

```bash
cd next-app

# Ensure all content is ingested into the database
npm run ingest-clinical:all
npm run ingest-pdfs --all
```

### Step 2: Build Bundle

```bash
# Build today's bundle (version auto-detected as YYYY.MM.DD)
npm run build-mobile-bundle

# Or specify explicit version
npx ts-node scripts/build-mobile-bundle.ts --version 2026.04.15

# Dry-run mode (preview without uploading)
npx ts-node scripts/build-mobile-bundle.ts --dry-run
```

### Step 3: Validate Bundle

```bash
# Validate the bundle
npx ts-node scripts/validate-bundle.ts 2026.04.15 --verbose

# Validate all bundles
npx ts-node scripts/validate-bundle.ts --all
```

### Step 4: Publish Bundle

The build script automatically:
1. Creates manifest with document list, hashes, embedding metadata
2. Compresses bundle with gzip
3. Signs with Ed25519 private key (SIGNING_KEY env var)
4. Uploads to storage (S3 or Supabase storage)
5. Registers in `mobile_content_bundles` database table

### Step 5: Monitor Rollout

```typescript
import { getLatestBundle, getBundleDownloadStats } from '@/services/bundlePublisher';

// Get latest bundle
const bundle = await getLatestBundle();
console.log(`Latest: v${bundle.version}, published: ${bundle.publishedAt}`);

// Get download stats (Phase 2)
const stats = await getBundleDownloadStats(bundle.version);
console.log(`Downloads: ${stats.downloads}, app versions: ${stats.appVersions}`);
```

## Version Management Strategy

### Version Format

**YYYY.MM.DD** — Date-based semantic versioning

Examples:
- `2026.04.15` — Published April 15, 2026
- `2026.01.01` — Published January 1, 2026

### Benefits of Date-Based Versioning

- **Chronological sorting** — Newer versions always sort higher
- **Easy auditing** — Know exact publication date from version string
- **No manual tracking** — Version auto-incremented daily
- **Timezone-aware** — Use UTC for consistency

### Multiple Concurrent Versions

Apps don't immediately upgrade when a new version is available. Instead:

1. **Latest version published** — v2026.04.15
2. **Apps check for updates** — Every 12 hours on Wi-Fi
3. **Gradual rollout** — 20% of users → 50% → 100% (Phase 2)
4. **Rollback capability** — Old versions remain available for 30 days

### Publish History

```sql
SELECT version, published_at, published_by, notes
FROM mobile_content_bundles
ORDER BY published_at DESC
LIMIT 10;
```

### Rollback Procedure

If a bundle is found to be corrupted or invalid:

1. **Do NOT delete the version** — Keep for forensics
2. **Publish new version** with fixes
3. **Apps will auto-upgrade** to newer version on next check

```bash
# Publish a hotfix
npx ts-node scripts/build-mobile-bundle.ts --version 2026.04.16

# Previous apps will detect newer version and update
```

## Bundle Manifest Structure

The manifest (JSON) lists all contents with verification metadata:

```json
{
  "version": "2026.04.15",
  "timestamp": "2026-04-15T10:30:00Z",
  "documents": [
    {
      "slug": "who-pcpnc-2023",
      "title": "WHO PCPNC 3rd Edition 2023",
      "vertical": "CLINICAL",
      "size": 52341,
      "sha256": "a1b2c3d4e5f6...",
      "embedding_count": 45,
      "chunk_count": 45
    }
  ],
  "formulary": {
    "entry_count": 1250,
    "last_updated": "2026-04-15T09:00:00Z"
  },
  "embeddings_model": "text-embedding-3-small",
  "embeddings_sha256": "f6e5d4c3b2a1...",
  "total_chunks": 5420,
  "total_embeddings": 5420
}
```

### Manifest Fields

| Field | Type | Purpose |
|-------|------|---------|
| `version` | string | Version identifier (YYYY.MM.DD) |
| `timestamp` | ISO 8601 | When bundle was created (UTC) |
| `documents[]` | array | All clinical documents |
| `documents[].slug` | string | Unique identifier, safe for filesystem |
| `documents[].sha256` | string | SHA-256 of document content for verification |
| `documents[].embedding_count` | number | How many embeddings in this document |
| `formulary` | object | Drug/medicine database metadata |
| `formulary.entry_count` | number | Total formulary entries |
| `embeddings_model` | string | Which embedding model was used |
| `embeddings_sha256` | string | SHA-256 of all embedding vectors |
| `total_chunks` | number | Total document chunks |
| `total_embeddings` | number | Total embeddings (may be < total_chunks if some missing) |

## Mobile Bundle Consumption

### Getting Latest Bundle

Apps fetch the latest bundle from the API endpoint:

```
GET /api/mobile/bundle/latest?clientId=abc123&appVersion=1.0.0
```

Response includes manifest, signature, and metadata:

```json
{
  "version": "2026.04.15",
  "manifest": { ... },
  "signature": "MEUCIQDx...(base64)",
  "publishedAt": "2026-04-15T10:30:00Z",
  "signatureValid": true,
  "isUpdate": true
}
```

### Signature Verification

Every bundle includes an Ed25519 signature. Mobile apps must verify:

```kotlin
// Android (Kotlin)
val publicKey = Ed25519PublicKey(publicKeyBytes) // 32 bytes
val signature = Signature(signatureBytes)
val isValid = publicKey.verify(manifestJson.toByteArray(), signature)
if (!isValid) {
    throw SecurityException("Bundle signature invalid — rejecting update")
}
```

### Query Parameters

| Parameter | Type | Purpose |
|-----------|------|---------|
| `clientId` | string | Optional: Track which clients are updating |
| `appVersion` | string | Optional: For app compatibility checks |
| `currentVersion` | string | Optional: For comparison (`isUpdate` field in response) |

## Offline Content Structure on Device

After downloading and verifying a bundle, the app extracts contents:

```
/data/data/org.unfpa.otg/   (Android internal storage)
├── knowledge/
│   ├── index.json          # All chunks with metadata
│   ├── documents/
│   │   ├── who-pcpnc-2023.json
│   │   └── unfpa-handbook.json
│   └── chunks/
│       ├── chunk-001.bin
│       └── chunk-002.bin
├── embeddings/
│   ├── vectors.bin         # All vectors as packed float32
│   └── metadata.json       # Dimension info, chunk mapping
├── formulary/
│   └── formulary.json      # Drug database
└── bundle-manifest.json    # Downloaded manifest for reference
```

### Index Format

The `index.json` file in knowledge directory:

```json
{
  "version": "2026.04.15",
  "generatedAt": "2026-04-15T10:30:00Z",
  "totalChunks": 5420,
  "embeddingModel": "text-embedding-3-small",
  "embeddingDims": 1536,
  "chunks": [
    {
      "chunkId": "who-pcpnc-2023-0",
      "documentSlug": "who-pcpnc-2023",
      "documentTitle": "WHO PCPNC 3rd Edition 2023",
      "vertical": "CLINICAL",
      "chunkIndex": 0,
      "content": "...",
      "wordCount": 950,
      "sourceDocument": "WHO PCPNC 2023",
      "sourceEdition": "3rd edition",
      "sourceSection": "Section 3.2",
      "sourcePage": 47,
      "contentHash": "sha256..."
    }
  ]
}
```

## Update Frequency & Rollout

### Recommended Update Schedule

| Scenario | Frequency | Strategy |
|----------|-----------|----------|
| Clinical content updates | Weekly (Mondays) | Publish every Monday at 00:00 UTC |
| Emergency updates | As needed | Same-day publication, mark as `urgent` |
| Formulary updates | Monthly | First day of month |
| Holiday periods | Reduced | Skip updates on major holidays |

### How Mobile Apps Check for Updates

```kotlin
// Every 12 hours on Wi-Fi only
val constraints = Constraints.Builder()
    .setRequiredNetworkType(NetworkType.UNMETERED) // Wi-Fi only
    .build()

val request = PeriodicWorkRequestBuilder<KnowledgeSyncWorker>(12, TimeUnit.HOURS)
    .setConstraints(constraints)
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "knowledge_sync",
    ExistingPeriodicWorkPolicy.KEEP,
    request
)
```

### Gradual Rollout (Phase 2)

For large updates, enable canary mode:

```typescript
// Mark as canary rollout for 20% of users
await registerBundleInDatabase(manifest, signature, {
  canaryMode: true,
  canaryPercentage: 20, // Start with 20%
});

// After 48 hours, increase to 50%
// After 7 days, full rollout
```

Apps will respect canary configuration and only upgrade if selected.

## Security & Verification

### Ed25519 Signing

Every bundle is signed with a private key to prevent tampering:

```bash
# Generate Ed25519 keypair (one-time)
openssl genpkey -algorithm Ed25519 -out bundle-key.pem

# Export public key
openssl pkey -in bundle-key.pem -pubout -out bundle-key.pub

# Encode private key as base64 for SIGNING_KEY env var
cat bundle-key.pem | base64 | tr -d '\n'
```

### Signature Verification on Device

```kotlin
// Load public key from app resources
val publicKeyPem = assets.open("bundle-key.pub").readBytes()
val publicKey = PublicKeyLoader.loadEd25519PublicKey(publicKeyPem)

// Verify signature
val valid = publicKey.verify(
    manifestJson.toByteArray(),
    signature.fromBase64()
)

if (!valid) {
    Log.e("Bundle", "Signature verification failed!")
    throw SecurityException("Bundle corrupted or tampered")
}
```

### Hash Verification

Each document and the full embedding set have SHA-256 hashes:

```kotlin
// Verify document hash after download
val downloadedContent = downloadDocument(doc.slug)
val actualHash = sha256(downloadedContent)
val expectedHash = doc.sha256

if (actualHash != expectedHash) {
    throw SecurityException("Document hash mismatch — possible corruption")
}
```

### Environment Variables

Required for bundle creation:

```bash
# .env (next-app)

# Ed25519 private key (base64-encoded)
SIGNING_KEY="MC4CAQAwBQYDK2VwBCIEIHEX+..."

# Storage configuration (S3 or Supabase)
S3_BUCKET="mobile-bundles"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."

# Or Supabase
SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."

# Optional: Who is publishing
PUBLISHED_BY="ci-service@unfpa.org"
```

## Troubleshooting

### Bundle Creation Issues

#### "SIGNING_KEY not set"

```bash
# Generate and export key
openssl genpkey -algorithm Ed25519 -out /tmp/key.pem
export SIGNING_KEY=$(cat /tmp/key.pem | base64 | tr -d '\n')

# Then run
npm run build-mobile-bundle
```

#### "No documents found"

Ensure documents are ingested first:

```bash
npm run ingest-clinical:all
npm run ingest-pdfs --all

# Check database
sqlite3 unfpa.db "SELECT COUNT(*) FROM knowledge_documents;"
```

#### "Bundle size too large"

- Reduce number of embedded documents
- Exclude non-essential verticals
- Compress vectors to lower precision (Phase 2)

### Validation Issues

#### "Signature verification failed"

Ensure SIGNING_KEY in `.env` matches the key that signed the bundle.

#### "Manifest SHA-256 mismatch"

The manifest was modified after signing. Do not edit `manifest.json` manually.

#### "Compression ratio too low"

Bundle contents are not compressing well. Possible causes:

- Content is already compressed (images, PDFs)
- Embedding vectors have high entropy
- No redundancy in text

Consider switching to different compression algorithm (Phase 2).

### Mobile App Issues

#### "Bundle signature invalid on device"

1. Check public key is correctly embedded in app
2. Verify SIGNING_KEY env var on build server matches app
3. Ensure manifest is not being modified after signing

#### "App not downloading new bundle"

1. Check app has network access (Wi-Fi required)
2. Verify new bundle is actually published: `GET /api/mobile/bundle/latest`
3. Check app version compatibility (if version checks implemented)

#### "Device runs out of storage"

Bundle unpacks to 50-100 MB. Older bundles should be cleaned up automatically. If not:

```kotlin
// Delete old bundles manually
val bundleDir = context.getExternalFilesDir("bundles")
bundleDir?.listFiles()?.forEach { file ->
    if (file.name != latestVersion) {
        file.deleteRecursively()
    }
}
```

## API Reference

### Build Bundle Script

```bash
npx ts-node scripts/build-mobile-bundle.ts [OPTIONS]

Options:
  --version <version>     Explicit version (default: today's date YYYY.MM.DD)
  --dry-run              Preview without uploading
  --no-upload            Create locally but don't upload to storage
  --sign-only            Regenerate signature for existing bundle
```

### Validate Bundle Script

```bash
npx ts-node scripts/validate-bundle.ts <version|latest|--all> [OPTIONS]

Options:
  -v, --verbose          Show detailed validation report
  --all                  Validate all bundles
```

### API Endpoints

#### GET /api/mobile/bundle/latest

Get the latest bundle manifest and signature.

**Query Parameters:**
- `clientId` (optional): For analytics
- `appVersion` (optional): For compatibility checks
- `currentVersion` (optional): For comparison

**Response:**
```json
{
  "version": "2026.04.15",
  "manifest": { ... },
  "signature": "...",
  "publishedAt": "2026-04-15T10:30:00Z",
  "signatureValid": true,
  "isUpdate": true
}
```

**Status Codes:**
- 200: Bundle found and returned
- 404: No bundle available
- 503: Database unavailable

### Bundle Publisher Service

```typescript
import {
  getLatestBundle,
  getBundleByVersion,
  listBundles,
  verifyBundleSignature,
  recordBundleDownload,
  getBundleDownloadStats,
} from '@/services/bundlePublisher';

// Get latest
const bundle = await getLatestBundle();

// Get specific version
const v1 = await getBundleByVersion('2026.04.15');

// List all (with pagination)
const { bundles, total } = await listBundles(10, 0);

// Verify signature
const result = verifyBundleSignature(manifest, signature);
if (!result.valid) {
  throw new Error(result.error);
}

// Track download
await recordBundleDownload('2026.04.15', 'v1.0.0', { deviceId: '...' });

// Get stats
const stats = await getBundleDownloadStats('2026.04.15');
```

## Related Documentation

- [Android KnowledgeSyncWorker](../android/app/src/main/java/org/unfpa/otg/sync/KnowledgeSyncWorker.kt) — Bundle download and verification
- [Knowledge Ingestion Pipeline](./PLAN-R05-FOUNDATIONS-DIRECTORY.md) — How documents are prepared
- [Clinical Source Registry](../SECURITY.md) — Verification and audit trails
