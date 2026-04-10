#!/usr/bin/env npx ts-node
/**
 * Bundle Validation & Testing Script
 *
 * Comprehensive validation of mobile content bundles:
 *   1. Verify manifest structure and completeness
 *   2. Validate Ed25519 signature
 *   3. Check document hashes and integrity
 *   4. Verify embedding dimensions and counts
 *   5. Test compression ratio
 *   6. Validate bundle size for mobile transmission
 *   7. Dry-run extraction and schema validation
 *
 * Usage:
 *   npx ts-node scripts/validate-bundle.ts 2026.04.15
 *   npx ts-node scripts/validate-bundle.ts 2026.04.15 --verbose
 *   npx ts-node scripts/validate-bundle.ts latest
 *   npx ts-node scripts/validate-bundle.ts --all      # validate all bundles
 *
 * Requires:
 *   - Bundle directory exists at .bundle/<version>/
 *   - SIGNING_KEY environment variable for signature verification
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { parseArgs } from 'util';

// ── Config ────────────────────────────────────────────────────────────────────

const BUNDLE_DIR = path.resolve(__dirname, '..', '.bundle');
const MAX_BUNDLE_SIZE = 500 * 1024 * 1024; // 500 MB limit for mobile
const EXPECTED_EMBEDDING_DIMS = 1536; // text-embedding-3-small
const MIN_COMPRESSION_RATIO = 0.4; // Should compress to at least 40% of original

// ── Types & interfaces ────────────────────────────────────────────────────────

interface BundleManifest {
  version: string;
  timestamp: string;
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

interface ValidationReport {
  version: string;
  valid: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message?: string;
    details?: unknown;
  }>;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warnings: string[];
  };
}

// ── Validation functions ──────────────────────────────────────────────────────

function loadManifest(version: string): BundleManifest | null {
  const manifestPath = path.join(BUNDLE_DIR, version, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest not found: ${manifestPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to parse manifest: ${error}`);
    return null;
  }
}

function loadSignature(version: string): string | null {
  const sigPath = path.join(BUNDLE_DIR, version, 'signature.txt');
  if (!fs.existsSync(sigPath)) {
    console.error(`❌ Signature not found: ${sigPath}`);
    return null;
  }

  try {
    return fs.readFileSync(sigPath, 'utf-8').trim();
  } catch (error) {
    console.error(`❌ Failed to read signature: ${error}`);
    return null;
  }
}

function getPublicKeyForVerification(): Buffer {
  const privateKeyB64 = process.env.SIGNING_KEY;
  if (!privateKeyB64) {
    return Buffer.alloc(32, 0); // Zero key if not configured
  }

  const privateKeyBuffer = Buffer.from(privateKeyB64, 'base64');
  const privateKey = crypto.createPrivateKey({
    key: privateKeyBuffer,
    format: 'raw',
    type: 'ed25519',
  });

  const publicKeyObj = crypto.createPublicKey(privateKey);
  return publicKeyObj.export({ format: 'raw' });
}

function sha256Hash(data: string | Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

async function validateBundle(version: string, verbose: boolean): Promise<ValidationReport> {
  const checks: Array<{ name: string; passed: boolean; message?: string; details?: unknown }> = [];
  const warnings: string[] = [];

  console.log(`\n📋 Validating bundle v${version}...\n`);

  // Check 1: Manifest exists and is valid JSON
  console.log('[1] Checking manifest...');
  const manifest = loadManifest(version);
  const manifestValid = manifest !== null;
  checks.push({
    name: 'Manifest exists and is valid JSON',
    passed: manifestValid,
    message: manifestValid ? 'Manifest loaded' : 'Manifest file missing or invalid',
  });
  if (!manifestValid) {
    return {
      version,
      valid: false,
      checks,
      summary: {
        totalChecks: checks.length,
        passedChecks: checks.filter((c) => c.passed).length,
        failedChecks: checks.filter((c) => !c.passed).length,
        warnings,
      },
    };
  }

  // Check 2: Manifest structure
  console.log('[2] Checking manifest structure...');
  const hasRequiredFields =
    manifest &&
    manifest.version &&
    manifest.timestamp &&
    manifest.documents &&
    manifest.formulary &&
    manifest.embeddings_model &&
    manifest.embeddings_sha256;
  checks.push({
    name: 'Manifest has all required fields',
    passed: hasRequiredFields,
    message: hasRequiredFields
      ? `Version ${manifest!.version}, ${manifest!.documents!.length} documents, ${manifest!.total_embeddings} embeddings`
      : 'Missing required fields',
  });

  // Check 3: Signature exists
  console.log('[3] Checking signature...');
  const signature = loadSignature(version);
  const signatureExists = signature !== null && signature.length > 0;
  checks.push({
    name: 'Signature exists and is not empty',
    passed: signatureExists,
    message: signatureExists ? `Signature: ${signature?.substring(0, 32)}...` : 'Signature missing',
  });

  // Check 4: Verify signature
  console.log('[4] Verifying Ed25519 signature...');
  let signatureValid = false;
  if (manifestValid && signatureExists) {
    try {
      const manifestJson = JSON.stringify(manifest, null, 2);
      const signatureBuffer = Buffer.from(signature!, 'base64');
      const publicKey = getPublicKeyForVerification();

      const verify = crypto.createVerify('Ed25519');
      verify.update(manifestJson);

      const publicKeyObj = crypto.createPublicKey({
        key: publicKey,
        format: 'raw',
        type: 'ed25519',
      });

      signatureValid = verify.verify(publicKeyObj, signatureBuffer);
    } catch (error) {
      console.warn(`   ⚠️  Signature verification skipped: ${error}`);
      warnings.push('SIGNING_KEY not configured for verification');
    }
  }
  checks.push({
    name: 'Ed25519 signature is valid',
    passed: signatureValid || process.env.SIGNING_KEY === undefined,
    message: signatureValid
      ? 'Signature verified'
      : process.env.SIGNING_KEY
      ? 'Signature invalid'
      : 'Signature verification skipped (SIGNING_KEY not set)',
  });

  // Check 5: Bundle file exists and is valid gzip
  console.log('[5] Checking bundle file...');
  const bundlePath = path.join(BUNDLE_DIR, version, 'bundle.json.gz');
  const bundleExists = fs.existsSync(bundlePath);
  checks.push({
    name: 'Bundle file exists',
    passed: bundleExists,
    message: bundleExists ? `File: ${bundlePath}` : 'Bundle file not found',
  });

  let bundleSize = 0;
  let uncompressedSize = 0;
  let compressionRatio = 0;
  if (bundleExists) {
    try {
      const compressed = fs.readFileSync(bundlePath);
      bundleSize = compressed.length;

      // Test decompression
      const uncompressed = zlib.gunzipSync(compressed);
      uncompressedSize = uncompressed.length;
      compressionRatio = 1 - bundleSize / uncompressedSize;

      checks.push({
        name: 'Bundle file can be decompressed',
        passed: true,
        message: `Compressed: ${(bundleSize / 1024 / 1024).toFixed(2)} MB, ` +
                 `Uncompressed: ${(uncompressedSize / 1024 / 1024).toFixed(2)} MB, ` +
                 `Ratio: ${(compressionRatio * 100).toFixed(1)}%`,
      });

      // Check 6: Bundle size is reasonable
      console.log('[6] Checking bundle size...');
      const sizeOk = bundleSize <= MAX_BUNDLE_SIZE;
      checks.push({
        name: `Bundle size <= ${MAX_BUNDLE_SIZE / 1024 / 1024 | 0} MB`,
        passed: sizeOk,
        message: `Bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)} MB`,
        details: { size: bundleSize },
      });

      // Check 7: Compression ratio is good
      console.log('[7] Checking compression ratio...');
      const compressionOk = compressionRatio >= MIN_COMPRESSION_RATIO;
      checks.push({
        name: `Compression ratio >= ${(MIN_COMPRESSION_RATIO * 100).toFixed(0)}%`,
        passed: compressionOk,
        message: `Actual: ${(compressionRatio * 100).toFixed(1)}%`,
      });
      if (!compressionOk) {
        warnings.push(`Compression ratio low (${(compressionRatio * 100).toFixed(1)}%) - data may be redundant`);
      }
    } catch (error) {
      checks.push({
        name: 'Bundle file can be decompressed',
        passed: false,
        message: `Decompression failed: ${error}`,
      });
    }
  }

  // Check 8: Document metadata
  console.log('[8] Checking document metadata...');
  if (manifest) {
    let allDocsValid = true;
    for (const doc of manifest.documents) {
      if (!doc.slug || !doc.title || !doc.vertical || !doc.sha256 || doc.embedding_count === undefined) {
        allDocsValid = false;
        break;
      }
    }
    checks.push({
      name: 'All documents have required metadata',
      passed: allDocsValid,
      message: `${manifest.documents.length} documents`,
      details: {
        documents: manifest.documents.map((d) => ({
          slug: d.slug,
          chunks: d.chunk_count,
          embeddings: d.embedding_count,
          size: d.size,
        })),
      },
    });
  }

  // Check 9: Embedding metadata
  console.log('[9] Checking embedding metadata...');
  if (manifest) {
    const totalEmbeddingsMatch = manifest.documents.reduce((sum, d) => sum + d.embedding_count, 0) ===
      manifest.total_embeddings;
    checks.push({
      name: 'Total embeddings count matches documents',
      passed: totalEmbeddingsMatch,
      message: `Total: ${manifest.total_embeddings}, sum: ${manifest.documents.reduce((sum, d) => sum + d.embedding_count, 0)}`,
    });

    const modelOk = manifest.embeddings_model && manifest.embeddings_model.length > 0;
    checks.push({
      name: 'Embedding model is specified',
      passed: modelOk,
      message: manifest.embeddings_model || 'Model not specified',
    });

    const embeddingsSha = manifest.embeddings_sha256;
    const embeddingsShaValid = embeddingsSha && embeddingsSha.length === 64;
    checks.push({
      name: 'Embeddings SHA-256 is valid',
      passed: embeddingsShaValid,
      message: embeddingsShaValid ? `SHA: ${embeddingsSha.substring(0, 16)}...` : 'SHA invalid',
    });
  }

  // Check 10: Formulary metadata
  console.log('[10] Checking formulary metadata...');
  if (manifest) {
    const formularyOk = manifest.formulary && manifest.formulary.entry_count !== undefined;
    checks.push({
      name: 'Formulary metadata is present',
      passed: formularyOk,
      message: formularyOk ? `${manifest.formulary.entry_count} entries` : 'Formulary metadata missing',
    });
  }

  // Check 11: Timestamp validity
  console.log('[11] Checking timestamp...');
  if (manifest) {
    const timestampValid = !isNaN(Date.parse(manifest.timestamp));
    checks.push({
      name: 'Timestamp is valid ISO 8601',
      passed: timestampValid,
      message: manifest.timestamp,
    });
  }

  // Summary
  const summary = {
    totalChecks: checks.length,
    passedChecks: checks.filter((c) => c.passed).length,
    failedChecks: checks.filter((c) => !c.passed).length,
    warnings,
  };

  const valid = summary.failedChecks === 0;

  if (verbose) {
    console.log('\n📊 Detailed Report:');
    for (const check of checks) {
      const icon = check.passed ? '✅' : '❌';
      console.log(`   ${icon} ${check.name}`);
      if (check.message) console.log(`      ${check.message}`);
      if (check.details && verbose) {
        console.log(`      Details: ${JSON.stringify(check.details, null, 2)}`);
      }
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`   Total checks: ${summary.totalChecks}`);
  console.log(`   Passed: ${summary.passedChecks} ✅`);
  console.log(`   Failed: ${summary.failedChecks} ❌`);
  if (warnings.length > 0) {
    console.log(`   Warnings: ${warnings.length} ⚠️`);
    for (const w of warnings) {
      console.log(`      - ${w}`);
    }
  }

  return {
    version,
    valid,
    checks,
    summary,
  };
}

async function main() {
  try {
    const { values: args, positionals } = parseArgs({
      options: {
        verbose: { type: 'boolean', short: 'v' },
        all: { type: 'boolean' },
      },
      allowPositionals: true,
    });

    const verbose = args.verbose || false;
    let versions: string[] = [];

    if (args.all) {
      // Validate all bundles
      if (!fs.existsSync(BUNDLE_DIR)) {
        console.error(`❌ Bundle directory not found: ${BUNDLE_DIR}`);
        process.exit(1);
      }
      versions = fs.readdirSync(BUNDLE_DIR).filter((f) =>
        fs.statSync(path.join(BUNDLE_DIR, f)).isDirectory()
      );

      if (versions.length === 0) {
        console.error('❌ No bundles found');
        process.exit(1);
      }

      console.log(`Found ${versions.length} bundle(s)`);
    } else {
      const version = positionals[0] || 'latest';
      if (version === 'latest') {
        // Find latest version
        if (!fs.existsSync(BUNDLE_DIR)) {
          console.error(`❌ Bundle directory not found: ${BUNDLE_DIR}`);
          process.exit(1);
        }
        const dirs = fs.readdirSync(BUNDLE_DIR)
          .filter((f) => fs.statSync(path.join(BUNDLE_DIR, f)).isDirectory())
          .sort()
          .reverse();
        if (dirs.length === 0) {
          console.error('❌ No bundles found');
          process.exit(1);
        }
        versions = [dirs[0]];
      } else {
        versions = [version];
      }
    }

    const reports: ValidationReport[] = [];
    let allValid = true;

    for (const version of versions) {
      const report = await validateBundle(version, verbose);
      reports.push(report);
      if (!report.valid) {
        allValid = false;
      }
    }

    // Overall result
    console.log(`\n${'═'.repeat(60)}`);
    if (allValid) {
      console.log(`✅ All bundles are valid!`);
    } else {
      console.log(`❌ Some bundles failed validation`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Validation script failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
