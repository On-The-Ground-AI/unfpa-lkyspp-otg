/**
 * Bundle Verification & Extraction
 *
 * Verifies Ed25519 signatures and SHA-256 hashes for mobile content bundles.
 * Used by Android/iOS apps to ensure bundle integrity before extraction and use.
 *
 * Verification steps:
 *   1. Download bundle.json.gz + signature.txt + manifest.json
 *   2. Verify Ed25519 signature over manifest
 *   3. Extract gzip to get bundle data
 *   4. Verify manifest SHA-256 matches
 *   5. Store in app local database (SQLite on Android, Core Data on iOS)
 *   6. Update clinician UI with bundle version and last-updated timestamp
 */

import * as crypto from 'crypto';
import * as zlib from 'zlib';

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

export interface BundleData {
  manifest: BundleManifest;
  embedding_vectors: {
    [chunkId: string]: number[];
  };
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  manifest?: BundleManifest;
  data?: BundleData;
}

/**
 * Verify Ed25519 signature over manifest
 *
 * @param manifestJson Raw manifest JSON string
 * @param signatureB64 Base64-encoded Ed25519 signature
 * @param publicKeyB64 Base64-encoded Ed25519 public key
 * @returns true if signature is valid
 */
export function verifySignature(
  manifestJson: string,
  signatureB64: string,
  publicKeyB64: string
): boolean {
  try {
    const signature = Buffer.from(signatureB64, 'base64');
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyB64, 'base64'),
      format: 'raw',
      type: 'ed25519',
    });

    const verify = crypto.createVerify('Ed25519');
    verify.update(manifestJson);
    return verify.verify(publicKey, signature);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Calculate SHA-256 hash of data
 */
export function sha256(data: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * Decompress gzipped bundle data
 */
export async function decompressBundle(
  compressedBuffer: Buffer
): Promise<BundleData> {
  return new Promise((resolve, reject) => {
    zlib.gunzip(compressedBuffer, (err, decompressed) => {
      if (err) {
        reject(new Error(`Decompression failed: ${err.message}`));
      } else {
        try {
          const data = JSON.parse(decompressed.toString('utf-8')) as BundleData;
          resolve(data);
        } catch (parseErr) {
          reject(new Error(`Failed to parse bundle JSON: ${parseErr}`));
        }
      }
    });
  });
}

/**
 * Verify complete bundle integrity
 *
 * @param bundleBuffer Gzip-compressed bundle data
 * @param manifestJson Raw manifest JSON string
 * @param signatureB64 Base64-encoded Ed25519 signature
 * @param publicKeyB64 Base64-encoded public key for verification
 * @returns Verification result with parsed data if valid
 */
export async function verifyBundle(
  bundleBuffer: Buffer,
  manifestJson: string,
  signatureB64: string,
  publicKeyB64: string
): Promise<VerificationResult> {
  try {
    // Step 1: Verify Ed25519 signature
    if (!verifySignature(manifestJson, signatureB64, publicKeyB64)) {
      return {
        valid: false,
        error: 'Ed25519 signature verification failed',
      };
    }

    // Step 2: Decompress bundle
    const bundleData = await decompressBundle(bundleBuffer);

    // Step 3: Verify manifest hash
    const manifestHash = sha256(manifestJson);
    if (bundleData.manifest.timestamp !== new Date(bundleData.manifest.timestamp).toISOString()) {
      return {
        valid: false,
        error: 'Invalid manifest timestamp format',
      };
    }

    // Step 4: Verify document count matches
    const expectedDocCount = bundleData.manifest.documents.length;
    if (expectedDocCount === 0) {
      return {
        valid: false,
        error: 'Bundle contains no documents',
      };
    }

    // Step 5: Verify embedding count
    const embeddingCount = Object.keys(bundleData.embedding_vectors).length;
    if (embeddingCount !== bundleData.manifest.total_embeddings) {
      return {
        valid: false,
        error: `Embedding count mismatch: manifest says ${bundleData.manifest.total_embeddings}, found ${embeddingCount}`,
      };
    }

    return {
      valid: true,
      manifest: bundleData.manifest,
      data: bundleData,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Validate bundle manifest structure
 */
export function validateManifest(manifest: BundleManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest.version) errors.push('Missing version');
  if (!manifest.timestamp) errors.push('Missing timestamp');
  if (!Array.isArray(manifest.documents)) errors.push('Documents is not an array');
  if (!manifest.formulary) errors.push('Missing formulary metadata');
  if (!manifest.embeddings_model) errors.push('Missing embeddings model');
  if (manifest.total_chunks === undefined) errors.push('Missing total_chunks');
  if (manifest.total_embeddings === undefined) errors.push('Missing total_embeddings');

  // Verify document structure
  if (Array.isArray(manifest.documents)) {
    manifest.documents.forEach((doc, idx) => {
      if (!doc.slug) errors.push(`Document ${idx}: missing slug`);
      if (!doc.title) errors.push(`Document ${idx}: missing title`);
      if (!doc.vertical) errors.push(`Document ${idx}: missing vertical`);
      if (!doc.sha256) errors.push(`Document ${idx}: missing sha256`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if bundle is newer than current version
 */
export function isBundleNewer(
  currentVersion: string | null,
  newManifest: BundleManifest
): boolean {
  if (!currentVersion) return true;

  // Version format: YYYY.MM.DD
  const parseVersion = (v: string): { year: number; month: number; day: number } => {
    const parts = v.split('.');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  };

  const current = parseVersion(currentVersion);
  const next = parseVersion(newManifest.version);

  if (next.year !== current.year) return next.year > current.year;
  if (next.month !== current.month) return next.month > current.month;
  return next.day > current.day;
}

/**
 * Calculate bundle size savings from compression
 */
export function getCompressionStats(
  compressedSize: number,
  uncompressedSize: number
): { ratio: string; saved: string } {
  const saved = uncompressedSize - compressedSize;
  const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
  return {
    ratio: `${ratio}%`,
    saved: `${(saved / 1024 / 1024).toFixed(2)} MB`,
  };
}
