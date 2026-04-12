# UNFPA OTG Clinical Knowledge Base - Deployment Guide

**Target Audience:** System administrators, DevOps engineers, and IT decision-makers  
**Last Updated:** April 12, 2026  
**Version:** 1.0.0-beta

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Supabase Setup](#supabase-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Initialization](#database-initialization)
6. [Clinical Content Ingestion](#clinical-content-ingestion)
7. [Bundle Creation & Publishing](#bundle-creation--publishing)
8. [Mobile App Configuration](#mobile-app-configuration)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Disaster Recovery](#disaster-recovery)

---

## Prerequisites

### System Requirements
- **Operating System:** Linux (Ubuntu 20.04+), macOS, or Windows (WSL2)
- **Node.js:** 18.x or higher
- **npm:** 8.x or higher
- **Docker** (optional, for containerized deployment): 20.10+
- **Database:** Supabase PostgreSQL instance (or self-hosted PostgreSQL 13+)
- **Storage:** AWS S3 or compatible (for bundle distribution)
- **SSL Certificate:** Valid HTTPS certificate for production

### Access Requirements
- Supabase account with billing enabled
- AWS account (if using S3 for bundles)
- Domain name registered (for HTTPS)
- DNS management access

### Developer Access
- GitHub repository access (`on-the-ground-ai/unfpa-lkyspp-otg`)
- CI/CD pipeline configuration (GitHub Actions)
- Secret management setup

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile Apps                           │
│             (Android, iOS, Web Browser)                  │
└────────┬────────────────────────────────────┬───────────┘
         │                                    │
         │ HTTP/HTTPS                         │
         ↓                                    ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js API Gateway                         │
│  (/api/clinical/*, /api/mobile/*, /api/bundles/*)      │
│            (Rate limiting, Auth, Logging)               │
└────────┬────────────────────────────────────┬───────────┘
         │                                    │
         │                                    │ Bundle
         │                                    │ Download
         ↓                                    ↓
┌──────────────────────┐         ┌────────────────────────┐
│  PostgreSQL + pgvector│         │   S3/Object Storage    │
│                       │         │  (Bundle Artifacts)    │
│ - Knowledge Base      │         │                        │
│ - Embeddings (384-dim)│         │ - Mobile bundles       │
│ - Formulary           │         │ - Version history      │
│ - Audit Logs          │         │ - Update manifests     │
└───────────────────────┘         └────────────────────────┘
```

**Data Flow:**
1. Mobile app queries `/api/clinical/search` with user query
2. API gateway authenticates, logs request
3. PostgreSQL vector search returns relevant chunks (pgvector cosine similarity)
4. API applies ranking and returns citations with page numbers
5. Mobile app downloads bundle containing full offline knowledge base from S3
6. Bundle integrity verified using Ed25519 signatures

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and log in
2. Click "New Project"
3. Select your organization
4. **Project name:** `unfpa-otg-clinical`
5. **Database password:** Generate strong password (save securely)
6. **Region:** Select closest to your users
7. Click "Create new project"
8. Wait for provisioning (3-5 minutes)

### Step 2: Enable pgvector Extension

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 3: Create Database Schema

Run the following schema creation SQL (available in `scripts/init-db.sql`):

```bash
# From project root:
supabase db pull  # Or run SQL file directly in Supabase editor
```

**Key tables:**
- `knowledge_documents` - Clinical documents (WHO guidelines, etc.)
- `knowledge_chunks` - 384-dimensional vector embeddings for semantic search
- `formulary_entries` - Drug database with contraindications/warnings
- `clinical_sources` - Metadata on clinical source documents
- `clinical_disclaimer_log` - Audit trail of clinical queries
- `mobile_content_bundles` - OTA bundle versions and signatures

### Step 4: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on key tables
ALTER TABLE clinical_disclaimer_log ENABLE ROW LEVEL SECURITY;

-- Allow logged-in users to read (but not write) their own logs
CREATE POLICY "Users can view own audit logs" ON clinical_disclaimer_log
  FOR SELECT
  USING (auth.uid()::text = user_id OR user_id IS NULL);

-- Admin can read all logs
CREATE POLICY "Admins can view all audit logs" ON clinical_disclaimer_log
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Step 5: Configure Backups

1. In Supabase dashboard, go to **Settings → Backups**
2. Enable automated daily backups
3. Set retention to 30 days
4. Test restore procedure monthly

---

## Environment Configuration

### Step 1: Get Supabase Credentials

1. In Supabase dashboard, go to **Settings → API**
2. Copy the following:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service role key)

### Step 2: Create `.env.local` File

Create `/home/user/unfpa-lkyspp-otg/next-app/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# API Configuration
NEXT_PUBLIC_API_URL=https://api.unfpa-otg.org
API_PORT=3000

# Signing Key for Bundle Signatures (Ed25519, base64-encoded)
SIGNING_KEY=base64_encoded_ed25519_private_key_here

# AWS S3 (for bundle distribution)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=unfpa-otg-bundles

# Feature Flags
FEATURE_OFFLINE_SEARCH=true
FEATURE_DRUG_INTERACTIONS=true
FEATURE_AUDIT_LOGGING=true

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info
```

### Step 3: Generate Ed25519 Signing Key

```bash
# Generate new Ed25519 key pair
cd next-app
npm run generate-signing-key

# This outputs:
# SIGNING_KEY (private key, base64) - add to .env.local
# PUBLIC_KEY (public key, base64) - keep for verification

# Save public key to git (it's public):
echo "PUBLIC_KEY_BASE64" > .env.example
```

---

## Database Initialization

### Step 1: Connect to Database

```bash
cd next-app

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Seed initial data (knowledge base, formulary)
npm run db:seed
```

### Step 2: Verify Database

```bash
# Test connection
npx ts-node --esm scripts/test-db-connection.ts

# Expected output:
# ✓ Connected to Supabase
# ✓ pgvector extension available
# ✓ Schema created successfully
```

---

## Clinical Content Ingestion

### Step 1: Validate JSONL Documents

All clinical JSONL files in `docs/knowledge-base/clinical/` must pass validation:

```bash
cd /home/user/unfpa-lkyspp-otg

# Validate all documents
npx ts-node --esm scripts/validate-clinical-sources.ts --all

# Expected output:
# ✓ WHO-MEC-Contraceptive-Eligibility.jsonl (1250 blocks)
# ✓ WHO-Safe-Abortion-Care.jsonl (680 blocks)
# ... (all documents)
# Total: 8 documents, 5,500+ blocks
```

### Step 2: Ingest Clinical Documents

```bash
# Generate embeddings and ingest documents
npm run ingest-clinical:all

# This will:
# 1. Load JSONL documents
# 2. Generate 384-dimensional embeddings for each chunk
# 3. Store in PostgreSQL knowledge_chunks table
# 4. Create metadata records for audit trail

# Expected time: 5-10 minutes depending on document size
# Monitor Supabase dashboard for disk usage growth
```

### Step 3: Ingest Formulary

```bash
# Load drug formulary
npm run ingest-formulary

# This will:
# 1. Parse formulary.json
# 2. Validate each drug entry
# 3. Create formulary_entries records
# 4. Index for full-text search

# Expected: 60+ drugs ingested successfully
```

### Step 4: Verify Ingestion

```bash
# Run integration test to verify search works
npm run test:integration

# Test should:
# ✓ Search for "postpartum hemorrhage"
# ✓ Retrieve ~5 relevant chunks
# ✓ Search for "oxytocin"
# ✓ Retrieve drug information from formulary
```

---

## Bundle Creation & Publishing

### Step 1: Build Mobile Bundle

```bash
# Create production bundle (for offline use)
npm run bundle:create --version 1.0.0

# This will:
# 1. Extract all knowledge chunks and embeddings
# 2. Compress into .tar.gz
# 3. Generate SHA-256 checksum
# 4. Sign with Ed25519 private key
# 5. Create manifest.json with metadata

# Output location: ./bundles/v1.0.0/
# - clinical-bundle-v1.0.0.tar.gz (50-100 MB)
# - manifest.json (with checksums)
# - signature.txt (Ed25519 signature)
```

### Step 2: Upload to S3

```bash
# Upload bundle to S3
npm run bundle:publish --version 1.0.0 --bucket unfpa-otg-bundles

# This will:
# 1. Upload bundle artifact
# 2. Upload manifest
# 3. Update bundle_index.json
# 4. Invalidate CDN cache if configured

# Verify:
aws s3 ls s3://unfpa-otg-bundles/bundles/v1.0.0/
```

### Step 3: Publish to Database

```bash
# Register bundle in database for mobile apps to discover
npm run bundle:register --version 1.0.0 --url https://bundles.unfpa-otg.org/v1.0.0/

# This will:
# 1. Create mobile_content_bundles record
# 2. Store manifest and signature
# 3. Mark as available for download
# 4. Store published timestamp for audit
```

### Step 4: Notify Mobile Apps

Mobile apps check `/api/mobile/bundles/latest` endpoint which returns:

```json
{
  "version": "1.0.0",
  "bundleUrl": "https://bundles.unfpa-otg.org/v1.0.0/clinical-bundle-v1.0.0.tar.gz",
  "manifest": { ... },
  "signature": "base64_signature...",
  "canaryMode": false,
  "publishedAt": "2026-04-12T10:00:00Z"
}
```

---

## Mobile App Configuration

### Android Configuration

File: `android/app/src/main/AndroidManifest.xml`

```xml
<!-- Add bundle server endpoint -->
<meta-data
    android:name="bundle_server_url"
    android:value="https://api.unfpa-otg.org/api/mobile/bundles/latest" />

<!-- Enable offline mode -->
<meta-data
    android:name="enable_offline_search"
    android:value="true" />
```

File: `android/app/build.gradle.kts`:

```kotlin
buildTypes {
    release {
        // Point to production API
        buildConfigField("String", "API_BASE_URL", "\"https://api.unfpa-otg.org\"")
        buildConfigField("String", "BUNDLE_URL", "\"https://bundles.unfpa-otg.org\"")
    }
    debug {
        // Point to development API
        buildConfigField("String", "API_BASE_URL", "\"http://localhost:3000\"")
        buildConfigField("String", "BUNDLE_URL", "\"http://localhost:3000/bundles\"")
    }
}
```

### iOS Configuration

File: `ios/OTG/Config/AppConfig.swift`:

```swift
struct AppConfig {
    static let apiBaseURL = "https://api.unfpa-otg.org"
    static let bundleServerURL = "https://bundles.unfpa-otg.org"
    static let enableOfflineSearch = true
}
```

### Web App Configuration

File: `next-app/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.unfpa-otg.org
NEXT_PUBLIC_BUNDLE_URL=https://bundles.unfpa-otg.org
NEXT_PUBLIC_ENABLE_OFFLINE=true
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl https://api.unfpa-otg.org/api/health

# Database connectivity
curl https://api.unfpa-otg.org/api/health/db

# Vector search functionality
curl -X POST https://api.unfpa-otg.org/api/clinical/search \
  -H "Content-Type: application/json" \
  -d '{"query":"postpartum hemorrhage","limit":3}'
```

### Log Monitoring

Clinical queries are logged in `clinical_disclaimer_log` table:

```sql
-- Check recent queries
SELECT 
  created_at, 
  user_id, 
  country, 
  question, 
  validator_passed 
FROM clinical_disclaimer_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Audit statistics
SELECT 
  country, 
  language,
  COUNT(*) as query_count,
  AVG(CASE WHEN validator_passed THEN 1 ELSE 0 END) as validator_pass_rate
FROM clinical_disclaimer_log
GROUP BY country, language;
```

### Regular Maintenance

**Daily:**
- Monitor Supabase dashboard for errors
- Check API response times (<500ms target)
- Verify bundle downloads are working

**Weekly:**
- Review audit logs for anomalies
- Check database backup status
- Monitor disk usage trends

**Monthly:**
- Update clinical content if new guidelines available
- Test disaster recovery procedures
- Review security logs for unauthorized access attempts
- Generate usage reports by country/language

### Performance Tuning

```sql
-- Create index for faster search (if not auto-created)
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Analyze query performance
EXPLAIN ANALYZE
SELECT 
  id, 
  content,
  1 - (embedding <=> '[...embedding vector...]'::vector) as similarity
FROM knowledge_chunks
WHERE 1 - (embedding <=> '[...]'::vector) > 0.6
ORDER BY embedding <=> '[...]'::vector
LIMIT 5;
```

---

## Troubleshooting

### Bundle Download Fails

**Problem:** Mobile apps unable to download bundle

**Solutions:**
1. Check S3 bucket permissions:
   ```bash
   aws s3api head-bucket --bucket unfpa-otg-bundles
   ```

2. Verify bundle exists:
   ```bash
   aws s3 ls s3://unfpa-otg-bundles/bundles/
   ```

3. Check signature verification:
   ```bash
   npm run bundle:verify --version 1.0.0
   ```

### Search Returns No Results

**Problem:** Vector search finds no matches

**Solutions:**
1. Verify embeddings were generated:
   ```sql
   SELECT COUNT(*), COUNT(embedding) FROM knowledge_chunks;
   ```

2. Check if documents were ingested:
   ```sql
   SELECT * FROM knowledge_documents LIMIT 5;
   ```

3. Run validation on JSONL:
   ```bash
   npm run validate-clinical-sources -- docs/knowledge-base/clinical/*.jsonl
   ```

### High API Latency

**Problem:** Search queries taking >1 second

**Solutions:**
1. Check database connections:
   ```bash
   curl https://api.unfpa-otg.org/api/health/db
   ```

2. Monitor Supabase CPU/RAM:
   - Go to Supabase Dashboard → Monitoring
   - Look for database load, connection pool exhaustion

3. Enable query result caching:
   ```bash
   # In .env.local
   ENABLE_SEARCH_CACHE=true
   CACHE_TTL_SECONDS=3600
   ```

### Audit Logs Growing Too Large

**Problem:** `clinical_disclaimer_log` table consuming disk space

**Solutions:**
1. Archive old logs to separate storage:
   ```sql
   -- Export logs older than 90 days
   SELECT * FROM clinical_disclaimer_log 
   WHERE created_at < NOW() - INTERVAL '90 days'
   -- Export to CSV, delete from main table
   ```

2. Enable log rotation (if available in Supabase)

3. Implement data retention policy

---

## Disaster Recovery

### Backup Strategy

1. **Automated Backups:** Supabase performs daily backups (retained 30 days)
2. **Manual Backups:** Monthly export of clinical data to S3
3. **Test Restores:** Monthly test of backup restoration

### Restore from Supabase Backup

```bash
# 1. Go to Supabase Dashboard → Backups
# 2. Select restore point
# 3. Click "Restore from this point"
# 4. Verify data integrity after restore

# Or via command line:
supabase db pull  # Download current schema
supabase db reset  # Reset to last clean state
```

### Manual Data Export

```bash
# Export all knowledge base content
pg_dump -h db.supabase.co -U postgres -d postgres \
  -t knowledge_documents \
  -t knowledge_chunks \
  -t formulary_entries \
  > /backup/clinical-data-backup.sql

# Upload to S3 for long-term storage
aws s3 cp /backup/clinical-data-backup.sql \
  s3://unfpa-otg-backups/$(date +%Y-%m-%d)-backup.sql
```

### RTO/RPO Targets

- **Recovery Time Objective (RTO):** < 2 hours
- **Recovery Point Objective (RPO):** < 24 hours

---

## Support & Contact

**Technical Issues:** [devops@unfpa-otg.org]  
**Clinical Questions:** [clinical-director@unfpa-otg.org]  
**Security Issues:** [security@unfpa-otg.org] (do not open public issues)

---

## Appendix: Useful Commands

```bash
# Install all dependencies
npm install --prefix next-app
npm install --prefix android
npm install --prefix ios

# Run validation suite
npm run validate-all --prefix next-app

# Run integration tests
npm run test:integration --prefix next-app

# Build production bundle
npm run bundle:create --version 1.0.0 --prefix next-app

# Check application logs
tail -f logs/application.log

# Database backup
npm run db:backup --prefix next-app
```

---

**Version History:**
- **1.0.0-beta** (Apr 12, 2026): Initial deployment guide
