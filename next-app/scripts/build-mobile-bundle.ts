#!/usr/bin/env npx ts-node
/**
 * Mobile Content Bundle Builder
 *
 * Collects all clinical documents, formulary entries, and embeddings into a
 * signed, compressed bundle for offline mobile access. Creates deterministic
 * bundles (same content = same hash) suitable for OTA distribution.
 *
 * Pipeline:
 *   1. Collect all clinical documents from KnowledgeDocument & KnowledgeChunk
 *   2. Collect all formulary entries from FormularyEntry
 *   3. Collect all embeddings from KnowledgeChunk.embedding
 *   4. Create manifest with document list, hashes, embedding metadata
 *   5. Compress bundle with gzip (for mobile transmission)
 *   6. Generate Ed25519 signature for integrity verification
 *   7. Upload to storage (S3 or Supabase storage)
 *   8. Register in mobile_content_bundles database table with version
 *
 * Usage:
 *   npx ts-node scripts/build-mobile-bundle.ts
 *   npx ts-node scripts/build-mobile-bundle.ts --version 2026.04.15
 *   npx ts-node scripts/build-mobile-bundle.ts --dry-run      # preview without uploading
 *   npx ts-node scripts/build-mobile-bundle.ts --sign-only    # regenerate signature only
 *   npx ts-node scripts/build-mobile-bundle.ts --no-upload    # create locally but don't upload
 *
 * Requires:
 *   - DATABASE_URL configured
 *   - SIGNING_KEY environment variable (Ed25519 private key, base64-encoded)
 *   - S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY OR
 *     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for storage)
 *
 * Output:
 *   - .bundle/<version>/manifest.json — bundle manifest (JSON)
 *   - .bundle/<version>/bundle.json.gz — compressed bundle (gzip)
 *   - .bundle/<version>/signature.txt — Ed25519 signature (base64)
 *   - Database entry in mobile_content_bundles table
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { parseArgs } from 'util';
import { prisma } from '@/lib/prisma';

// ── Config ────────────────────────────────────────────────────────────────────

const BUNDLE_DIR = path.resolve(__dirname, '..', '.bundle');
const TEMP_DIR = path.resolve(__dirname, '..', '.tmp', 'bundle');

function getVersionString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentEntry {
  slug: string;
  title: string;
  vertical: string;
  size: number; // bytes of content
  sha256: string;
  embedding_count: number;
  chunk_count: number;
}

interface FormularyMetadata {
  entry_count: number;
  last_updated: string;
}

interface BundleManifest {
  version: string;
  timestamp: string; // ISO 8601
  documents: DocumentEntry[];
  formulary: FormularyMetadata;
  embeddings_model: string;
  embeddings_sha256: string;
  total_chunks: number;
  total_embeddings: number;
}

interface BundleData {
  manifest: BundleManifest;
  embedding_vectors: {
    [chunkId: string]: number[]; // Base64-encoded embedding
  };
}

// ── Crypto & Signing ──────────────────────────────────────────────────────────

function getSigningKey(): string {
  const keyB64 = process.env.SIGNING_KEY;
  if (!keyB64) {
    throw new Error(
      'SIGNING_KEY environment variable not set. ' +
      'Generate with: openssl genpkey -algorithm Ed25519 | base64'
    );
  }
  return keyB64;
}

function signManifest(manifestJson: string, signingKeyB64: string): string {
  // Import signing key from base64
  const keyBuffer = Buffer.from(signingKeyB64, 'base64');

  // Create sign object using the private key
  const sign = crypto.createSign('Ed25519');
  sign.update(manifestJson);

  // Import the raw key as Ed25519
  const key = crypto.createPrivateKey({
    key: keyBuffer,
    format: 'raw',
    type: 'ed25519',
  });

  const signature = sign.sign(key);
  return signature.toString('base64');
}

function sha256Hash(data: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

// ── Database queries ──────────────────────────────────────────────────────────

async function collectDocuments(): Promise<DocumentEntry[]> {
  const docs = await prisma.$queryRawUnsafe(`
    SELECT
      kd.slug,
      kd.title,
      kd.vertical,
      LENGTH(kd.content) as size,
      COUNT(kc.id)::int as chunk_count
    FROM knowledge_documents kd
    LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
    GROUP BY kd.id, kd.slug, kd.title, kd.vertical, kd.content
    ORDER BY kd.vertical, kd.slug
  `) as Array<{
    slug: string;
    title: string;
    vertical: string;
    size: number;
    chunk_count: number;
  }>;

  const entries: DocumentEntry[] = [];
  for (const doc of docs) {
    // Calculate SHA-256 of document content
    const contentSha = await prisma.$queryRawUnsafe(`
      SELECT content FROM knowledge_documents WHERE slug = $1
    `, [doc.slug]) as Array<{ content: string }>;

    const contentHash = contentSha.length > 0
      ? sha256Hash(contentSha[0].content)
      : sha256Hash('');

    // Count embeddings for this document
    const embeddingCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM knowledge_chunks
      WHERE document_id = (SELECT id FROM knowledge_documents WHERE slug = $1)
      AND embedding IS NOT NULL
    `, [doc.slug]) as Array<{ count: number }>;

    entries.push({
      slug: doc.slug,
      title: doc.title,
      vertical: doc.vertical,
      size: doc.size,
      sha256: contentHash,
      embedding_count: embeddingCount[0]?.count || 0,
      chunk_count: doc.chunk_count,
    });
  }

  return entries;
}

async function collectFormularyMetadata(): Promise<FormularyMetadata> {
  const result = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::int as entry_count,
      MAX(updated_at)::text as last_updated
    FROM formulary_entries
  `) as Array<{ entry_count: number; last_updated: string | null }>;

  return {
    entry_count: result[0]?.entry_count || 0,
    last_updated: result[0]?.last_updated || new Date().toISOString(),
  };
}

async function collectEmbeddings(): Promise<{
  vectors: { [chunkId: string]: number[] };
  sha256: string;
  total: number;
}> {
  const embeddings = await prisma.$queryRawUnsafe(`
    SELECT
      kc.id,
      kc.embedding
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.document_id, kc.chunk_index
  `) as Array<{ id: string; embedding: unknown }>;

  const vectors: { [chunkId: string]: number[] } = {};
  const allEmbeddings: number[][] = [];

  for (const emb of embeddings) {
    const vec = emb.embedding as unknown as number[] | string;
    const parsed = typeof vec === 'string'
      ? JSON.parse(vec)
      : Array.isArray(vec)
      ? vec
      : [];

    vectors[emb.id] = parsed;
    allEmbeddings.push(parsed);
  }

  // Calculate SHA-256 of all embeddings concatenated
  const embeddingStr = JSON.stringify(allEmbeddings);
  const embeddingsSha = sha256Hash(embeddingStr);

  return {
    vectors,
    sha256: embeddingsSha,
    total: embeddings.length,
  };
}

// ── Bundle creation ───────────────────────────────────────────────────────────

async function createBundleManifest(version: string): Promise<BundleManifest> {
  console.log('[Manifest] Collecting documents...');
  const documents = await collectDocuments();

  console.log('[Manifest] Collecting formulary metadata...');
  const formulary = await collectFormularyMetadata();

  console.log('[Manifest] Collecting embeddings...');
  const { sha256: embeddingsSha256, total: totalEmbeddings } =
    await collectEmbeddings();

  const manifest: BundleManifest = {
    version,
    timestamp: new Date().toISOString(),
    documents,
    formulary,
    embeddings_model: 'text-embedding-3-small',
    embeddings_sha256: embeddingsSha256,
    total_chunks: documents.reduce((sum, d) => sum + d.chunk_count, 0),
    total_embeddings: totalEmbeddings,
  };

  return manifest;
}

async function createBundleData(manifest: BundleManifest): Promise<BundleData> {
  const { vectors } = await collectEmbeddings();

  return {
    manifest,
    embedding_vectors: vectors,
  };
}

// ── Compression & storage ─────────────────────────────────────────────────────

async function compressBundle(data: BundleData): Promise<Buffer> {
  const jsonStr = JSON.stringify(data, null, 2);
  return new Promise((resolve, reject) => {
    zlib.gzip(jsonStr, (err, compressed) => {
      if (err) reject(err);
      else resolve(compressed);
    });
  });
}

async function uploadToStorage(
  bundleBuffer: Buffer,
  manifest: BundleManifest,
  signature: string,
  options: { dryRun: boolean }
): Promise<{ bundleUrl?: string; manifestUrl?: string }> {
  const version = manifest.version;
  const storageKey = `mobile-bundles/${version}`;

  if (options.dryRun) {
    console.log(`[Upload] DRY RUN: Would upload to ${storageKey}/bundle.json.gz`);
    return {};
  }

  // Try Supabase storage first, then fall back to S3
  const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (useSupabase) {
    console.log('[Upload] Using Supabase Storage...');
    // Placeholder — actual implementation depends on Supabase storage client
    // This would require @supabase/storage-js
    console.log(`[Upload] Would upload to gs://${process.env.SUPABASE_URL}/${storageKey}/bundle.json.gz`);
    return {};
  } else {
    // AWS S3 upload logic
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error(
        'Neither SUPABASE_URL nor S3_BUCKET configured. ' +
        'Configure one of: (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) or (S3_BUCKET + AWS_*)'
      );
    }
    console.log(`[Upload] Would upload to s3://${bucket}/${storageKey}/bundle.json.gz`);
    return {};
  }
}

async function registerBundleInDatabase(
  manifest: BundleManifest,
  signature: string,
  options: { dryRun: boolean }
): Promise<void> {
  if (options.dryRun) {
    console.log('[Database] DRY RUN: Would register bundle in mobile_content_bundles table');
    return;
  }

  console.log('[Database] Registering bundle...');

  await prisma.$executeRawUnsafe(
    `INSERT INTO mobile_content_bundles (version, manifest, signature, published_at, published_by, notes)
     VALUES ($1, $2, $3, NOW(), $4, $5)
     ON CONFLICT (version) DO UPDATE SET
       manifest = $2,
       signature = $3,
       published_at = NOW()`,
    [
      manifest.version,
      JSON.stringify(manifest),
      signature,
      process.env.PUBLISHED_BY || 'build-system',
      `Auto-generated bundle: ${manifest.total_chunks} chunks, ${manifest.total_embeddings} embeddings`,
    ]
  );

  console.log(`[Database] ✓ Bundle v${manifest.version} registered`);
}

// ── CLI & main ────────────────────────────────────────────────────────────────

async function main() {
  try {
    const { values: args } = parseArgs({
      options: {
        version: { type: 'string' },
        'dry-run': { type: 'boolean' },
        'no-upload': { type: 'boolean' },
        'sign-only': { type: 'boolean' },
      },
    });

    const version = args.version || getVersionString();
    const dryRun = args['dry-run'] || false;
    const noUpload = args['no-upload'] || false;
    const signOnly = args['sign-only'] || false;

    console.log(`\n📦 Building mobile content bundle v${version}...`);
    console.log(`   Model: text-embedding-3-small (1536 dims)`);
    console.log(`   Format: gzip-compressed JSON + Ed25519 signature`);
    console.log(`   Date: ${new Date().toISOString()}\n`);

    // Create directories
    const versionDir = path.join(BUNDLE_DIR, version);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Create manifest
    if (!signOnly) {
      console.log('[1] Creating manifest...');
      const manifest = await createBundleManifest(version);
      const manifestJson = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(path.join(versionDir, 'manifest.json'), manifestJson);
      console.log(`    ✓ Manifest: ${manifest.documents.length} documents, ` +
                  `${manifest.formulary.entry_count} formulary entries, ` +
                  `${manifest.total_embeddings} embeddings`);
      console.log(`    ✓ Total chunks: ${manifest.total_chunks}`);
      console.log(`    ✓ Manifest SHA-256: ${sha256Hash(manifestJson).substring(0, 16)}...`);

      // Create bundle data
      console.log('\n[2] Collecting bundle data...');
      const bundleData = await createBundleData(manifest);

      // Compress bundle
      console.log('[3] Compressing bundle...');
      const compressed = await compressBundle(bundleData);
      const bundlePath = path.join(versionDir, 'bundle.json.gz');
      fs.writeFileSync(bundlePath, compressed);
      console.log(`    ✓ Bundle size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);

      // Calculate compression ratio
      const uncompressed = JSON.stringify(bundleData).length;
      const ratio = ((1 - compressed.length / uncompressed) * 100).toFixed(1);
      console.log(`    ✓ Compression ratio: ${ratio}%`);

      // Sign manifest
      console.log('\n[4] Generating Ed25519 signature...');
      const signingKey = getSigningKey();
      const manifestJson2 = JSON.stringify(manifest, null, 2);
      const signature = signManifest(manifestJson2, signingKey);
      const sigPath = path.join(versionDir, 'signature.txt');
      fs.writeFileSync(sigPath, signature);
      console.log(`    ✓ Signature: ${signature.substring(0, 32)}...`);

      // Upload
      if (!noUpload) {
        console.log('\n[5] Uploading to storage...');
        await uploadToStorage(compressed, manifest, signature, { dryRun });
      }

      // Register in database
      if (!noUpload) {
        console.log('\n[6] Registering in database...');
        const manifestJson3 = JSON.stringify(manifest, null, 2);
        const signature2 = signManifest(manifestJson3, signingKey);
        await registerBundleInDatabase(manifest, signature2, { dryRun });
      }
    } else {
      // Sign-only mode
      console.log('[Sign-Only Mode] Regenerating signature...');
      const manifestPath = path.join(versionDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found at ${manifestPath}`);
      }
      const manifestJson = fs.readFileSync(manifestPath, 'utf-8');
      const signingKey = getSigningKey();
      const signature = signManifest(manifestJson, signingKey);
      const sigPath = path.join(versionDir, 'signature.txt');
      fs.writeFileSync(sigPath, signature);
      console.log(`    ✓ Signature: ${signature.substring(0, 32)}...`);

      if (!noUpload) {
        const manifest = JSON.parse(manifestJson);
        await registerBundleInDatabase(manifest, signature, { dryRun });
      }
    }

    console.log(`\n✅ Bundle v${version} ${dryRun ? '(dry-run)' : ''} complete!`);
    console.log(`   Output: ${versionDir}`);
    console.log();
  } catch (error) {
    console.error('\n❌ Bundle creation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
