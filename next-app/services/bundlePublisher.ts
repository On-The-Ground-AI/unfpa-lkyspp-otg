/**
 * Mobile Bundle Publisher Service
 *
 * Handles publishing, validation, and distribution of mobile content bundles.
 * Includes:
 *   - Bundle metadata retrieval and caching
 *   - Signature verification for offline integrity checking
 *   - Download statistics tracking
 *   - Support for gradual rollout (canary versions)
 *   - Delta bundle preparation (Phase 2)
 */

import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BundleManifest {
  version: string;
  timestamp: string; // ISO 8601
  documents: Array<{
    slug: string;
    title: string;
    vertical: string;
    size: number;
    sha256: string;
    embedding_count: number;
    chunk_count: number;
  }>;
  formulary: {
    entry_count: number;
    last_updated: string;
  };
  embeddings_model: string;
  embeddings_sha256: string;
  total_chunks: number;
  total_embeddings: number;
}

export interface BundleMetadata {
  version: string;
  publishedAt: Date;
  publishedBy?: string;
  notes?: string;
  manifest: BundleManifest;
  signature: string;
  bundleUrl?: string;
  size?: number; // bytes
  checksumSha256?: string;
}

export interface BundleVerificationResult {
  valid: boolean;
  error?: string;
  manifestHash?: string;
}

export interface BundleDownloadInfo {
  version: string;
  bundleUrl: string;
  manifest: BundleManifest;
  signature: string;
  canaryMode: boolean;
  canaryPercentage?: number;
}

// ── In-memory cache for frequently-accessed bundles ────────────────────────────

const cache = new Map<string, {
  data: BundleMetadata;
  cachedAt: number;
}>();
const CACHE_TTL = 3600 * 1000; // 1 hour

function clearCache(key: string = ''): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

function getFromCache(key: string): BundleMetadata | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: BundleMetadata): void {
  cache.set(key, { data, cachedAt: Date.now() });
}

// ── Bundle retrieval ──────────────────────────────────────────────────────────

/**
 * Get the latest bundle metadata.
 * Used by mobile apps to check for updates.
 */
export async function getLatestBundle(): Promise<BundleMetadata | null> {
  const cacheKey = 'latest-bundle';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT version, manifest, signature, published_at, published_by, notes
      FROM mobile_content_bundles
      ORDER BY published_at DESC
      LIMIT 1
    `) as Array<{
      version: string;
      manifest: unknown;
      signature: string;
      published_at: Date;
      published_by?: string;
      notes?: string;
    }>;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const bundleMetadata: BundleMetadata = {
      version: row.version,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      notes: row.notes,
      manifest: row.manifest as BundleManifest,
      signature: row.signature,
    };

    setCache(cacheKey, bundleMetadata);
    return bundleMetadata;
  } catch (error) {
    console.error('Failed to retrieve latest bundle:', error);
    return null;
  }
}

/**
 * Get a specific bundle by version.
 */
export async function getBundleByVersion(version: string): Promise<BundleMetadata | null> {
  const cacheKey = `bundle-${version}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT version, manifest, signature, published_at, published_by, notes
      FROM mobile_content_bundles
      WHERE version = $1
      LIMIT 1
    `, [version]) as Array<{
      version: string;
      manifest: unknown;
      signature: string;
      published_at: Date;
      published_by?: string;
      notes?: string;
    }>;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const bundleMetadata: BundleMetadata = {
      version: row.version,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      notes: row.notes,
      manifest: row.manifest as BundleManifest,
      signature: row.signature,
    };

    setCache(cacheKey, bundleMetadata);
    return bundleMetadata;
  } catch (error) {
    console.error(`Failed to retrieve bundle v${version}:`, error);
    return null;
  }
}

/**
 * Get all published bundles with pagination.
 * Useful for admin dashboards and version history.
 */
export async function listBundles(
  limit = 10,
  offset = 0
): Promise<{ bundles: BundleMetadata[]; total: number }> {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT version, manifest, signature, published_at, published_by, notes
      FROM mobile_content_bundles
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]) as Array<{
      version: string;
      manifest: unknown;
      signature: string;
      published_at: Date;
      published_by?: string;
      notes?: string;
    }>;

    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as total FROM mobile_content_bundles
    `) as Array<{ total: number }>;

    const bundles: BundleMetadata[] = result.map((row) => ({
      version: row.version,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      notes: row.notes,
      manifest: row.manifest as BundleManifest,
      signature: row.signature,
    }));

    return {
      bundles,
      total: countResult[0]?.total || 0,
    };
  } catch (error) {
    console.error('Failed to list bundles:', error);
    return { bundles: [], total: 0 };
  }
}

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Get the public key for Ed25519 signature verification.
 * This is derived from the private key or stored separately.
 * In production, this would be fetched from a secure configuration.
 */
function getPublicKeyForVerification(): Buffer {
  // In a real implementation, this would:
  // 1. Fetch from a secure store (Vault, AWS Secrets Manager, etc.)
  // 2. Or derive from the stored private key
  // For now, we'll derive from the private key if available
  const privateKeyB64 = process.env.SIGNING_KEY;
  if (!privateKeyB64) {
    // Fallback: return a zero-filled buffer (will fail signature verification)
    // This is intentional to avoid accidentally accepting unsigned bundles
    return Buffer.alloc(32, 0);
  }

  const privateKeyBuffer = Buffer.from(privateKeyB64, 'base64');
  const privateKey = crypto.createPrivateKey({
    key: privateKeyBuffer,
    format: 'raw',
    type: 'ed25519',
  });

  // Extract public key from private key
  const publicKeyObj = crypto.createPublicKey(privateKey);
  return publicKeyObj.export({ format: 'raw' });
}

/**
 * Verify Ed25519 signature on bundle manifest.
 * Returns true if signature is valid, false otherwise.
 */
export function verifyBundleSignature(
  manifest: BundleManifest,
  signatureBase64: string
): BundleVerificationResult {
  try {
    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');

    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    const publicKey = getPublicKeyForVerification();

    const verify = crypto.createVerify('Ed25519');
    verify.update(manifestJson);

    const publicKeyObj = crypto.createPublicKey({
      key: publicKey,
      format: 'raw',
      type: 'ed25519',
    });

    const isValid = verify.verify(publicKeyObj, signatureBuffer);

    return {
      valid: isValid,
      manifestHash,
      error: isValid ? undefined : 'Invalid signature',
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// ── Download statistics tracking ──────────────────────────────────────────────

/**
 * Record a bundle download for analytics.
 * Tracks which versions are being used by mobile apps.
 */
export async function recordBundleDownload(
  version: string,
  appVersion?: string,
  deviceInfo?: Record<string, unknown>
): Promise<void> {
  try {
    // This would insert into a bundle_downloads or similar analytics table
    // For now, we just log it — in production this would be sent to analytics
    console.log(`[Analytics] Bundle download: v${version}, app=${appVersion || 'unknown'}`, deviceInfo);
  } catch (error) {
    console.error('Failed to record bundle download:', error);
  }
}

/**
 * Get download statistics for a specific bundle version.
 */
export async function getBundleDownloadStats(version: string): Promise<{
  downloads: number;
  lastDownload?: Date;
  appVersions: Record<string, number>;
}> {
  try {
    // This would query a bundle_downloads or analytics table
    // For now, return placeholder data
    return {
      downloads: 0,
      appVersions: {},
    };
  } catch (error) {
    console.error(`Failed to get download stats for v${version}:`, error);
    return { downloads: 0, appVersions: {} };
  }
}

// ── Canary/gradual rollout support ───────────────────────────────────────────

/**
 * Get bundle for a specific client, respecting canary rollout configuration.
 * Can return older versions during rollout to limit blast radius.
 */
export async function getBundleForClient(options: {
  clientId?: string;
  appVersion?: string;
  currentBundleVersion?: string;
}): Promise<BundleDownloadInfo | null> {
  const latest = await getLatestBundle();
  if (!latest) {
    return null;
  }

  // TODO: Implement canary logic
  // For now, always return the latest bundle
  // In production, this would:
  // 1. Check if a canary version is active
  // 2. Use clientId or appVersion to determine rollout percentage
  // 3. Return older version if client should not receive new version yet

  return {
    version: latest.version,
    bundleUrl: latest.bundleUrl || '',
    manifest: latest.manifest,
    signature: latest.signature,
    canaryMode: false,
  };
}

// ── Bundle comparison & delta support ──────────────────────────────────────────

/**
 * Compare two bundle manifests to identify changes.
 * Used for delta bundle generation (Phase 2).
 */
export function compareBundles(
  oldManifest: BundleManifest,
  newManifest: BundleManifest
): {
  added: string[];
  removed: string[];
  modified: string[];
} {
  const oldSlugs = new Set(oldManifest.documents.map((d) => d.slug));
  const newSlugs = new Set(newManifest.documents.map((d) => d.slug));

  const oldBySlug = new Map(oldManifest.documents.map((d) => [d.slug, d]));
  const newBySlug = new Map(newManifest.documents.map((d) => [d.slug, d]));

  const added = Array.from(newSlugs).filter((s) => !oldSlugs.has(s));
  const removed = Array.from(oldSlugs).filter((s) => !newSlugs.has(s));

  const modified = Array.from(oldSlugs)
    .filter((s) => newSlugs.has(s))
    .filter((s) => {
      const oldDoc = oldBySlug.get(s);
      const newDoc = newBySlug.get(s);
      return oldDoc?.sha256 !== newDoc?.sha256;
    });

  return { added, removed, modified };
}

// ── Cache management ──────────────────────────────────────────────────────────

/**
 * Invalidate cache when a new bundle is published.
 * Call this after successfully publishing a new bundle.
 */
export function invalidateBundleCache(version?: string): void {
  clearCache(version ? `bundle-${version}` : '');
}

/**
 * Preload bundle into cache (for optimization).
 */
export async function preloadBundleCache(version: string): Promise<void> {
  const bundle = await getBundleByVersion(version);
  if (bundle) {
    setCache(`bundle-${version}`, bundle);
  }
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): {
  cachedBundles: number;
  cacheSize: string;
} {
  return {
    cachedBundles: cache.size,
    cacheSize: `${cache.size} entries`,
  };
}
