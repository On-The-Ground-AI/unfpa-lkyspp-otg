import { describe, it, expect } from 'vitest';
import {
  sha256,
  validateManifest,
  isBundleNewer,
  getCompressionStats,
} from '@/lib/bundleVerification';
import type { BundleManifest } from '@/lib/bundleVerification';

describe('Bundle Verification', () => {
  describe('sha256', () => {
    it('calculates SHA-256 hash of string', () => {
      const result = sha256('test data');
      expect(result).toBeDefined();
      expect(result.length).toBe(64); // SHA-256 hex is 64 characters
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('calculates deterministic hash', () => {
      const hash1 = sha256('same content');
      const hash2 = sha256('same content');
      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different content', () => {
      const hash1 = sha256('content 1');
      const hash2 = sha256('content 2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateManifest', () => {
    const validManifest: BundleManifest = {
      version: '2026.04.12',
      timestamp: new Date().toISOString(),
      documents: [
        {
          slug: 'test-doc',
          title: 'Test Document',
          vertical: 'clinical',
          size: 1000,
          sha256: 'abc123',
          embedding_count: 10,
          chunk_count: 5,
        },
      ],
      formulary: {
        entry_count: 50,
        last_updated: new Date().toISOString(),
      },
      embeddings_model: 'text-embedding-3-small',
      embeddings_sha256: 'xyz789',
      total_chunks: 5,
      total_embeddings: 10,
    };

    it('validates correct manifest structure', () => {
      const result = validateManifest(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing version', () => {
      const manifest = { ...validManifest, version: '' };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('version'))).toBe(true);
    });

    it('detects missing documents array', () => {
      const manifest = { ...validManifest, documents: undefined as unknown as any[] };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('array'))).toBe(true);
    });

    it('detects missing document fields', () => {
      const manifest = {
        ...validManifest,
        documents: [{ slug: 'test' }] as unknown as any[],
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length > 0).toBe(true);
    });

    it('detects missing formulary', () => {
      const manifest = { ...validManifest, formulary: undefined as unknown as any };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('formulary'))).toBe(true);
    });

    it('detects missing embeddings metadata', () => {
      const manifest = { ...validManifest, embeddings_model: '' };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('embeddings'))).toBe(true);
    });
  });

  describe('isBundleNewer', () => {
    const manifest2026_04_15: BundleManifest = {
      version: '2026.04.15',
      timestamp: new Date().toISOString(),
      documents: [],
      formulary: { entry_count: 0, last_updated: new Date().toISOString() },
      embeddings_model: 'test',
      embeddings_sha256: 'test',
      total_chunks: 0,
      total_embeddings: 0,
    };

    const manifest2026_04_12: BundleManifest = {
      ...manifest2026_04_15,
      version: '2026.04.12',
    };

    const manifest2026_05_01: BundleManifest = {
      ...manifest2026_04_15,
      version: '2026.05.01',
    };

    it('returns true when current version is null', () => {
      expect(isBundleNewer(null, manifest2026_04_15)).toBe(true);
    });

    it('detects newer bundle by day', () => {
      expect(isBundleNewer('2026.04.12', manifest2026_04_15)).toBe(true);
    });

    it('detects newer bundle by month', () => {
      expect(isBundleNewer('2026.04.15', manifest2026_05_01)).toBe(true);
    });

    it('returns false when bundle is older', () => {
      expect(isBundleNewer('2026.04.15', manifest2026_04_12)).toBe(false);
    });

    it('returns false when bundle is same version', () => {
      expect(isBundleNewer('2026.04.15', manifest2026_04_15)).toBe(false);
    });

    it('detects older year correctly', () => {
      expect(isBundleNewer('2026.04.15', {
        ...manifest2026_04_15,
        version: '2025.12.31',
      })).toBe(false);
    });
  });

  describe('getCompressionStats', () => {
    it('calculates compression ratio correctly', () => {
      const stats = getCompressionStats(1000, 10000);
      expect(stats.ratio).toContain('9');
      expect(parseFloat(stats.ratio)).toBeGreaterThan(80);
    });

    it('calculates bytes saved', () => {
      const stats = getCompressionStats(1000000, 5000000);
      expect(stats.saved).toContain('MB');
      expect(parseFloat(stats.saved)).toBeCloseTo(3.81, 1);
    });

    it('handles edge case: no compression', () => {
      const stats = getCompressionStats(10000, 10000);
      expect(stats.ratio).toBe('0.0%');
      expect(stats.saved).toBe('0.00 MB');
    });

    it('handles edge case: maximum compression', () => {
      const stats = getCompressionStats(1000, 1000000);
      expect(parseFloat(stats.ratio)).toBeCloseTo(99.9, 0);
    });
  });

  describe('Bundle version format validation', () => {
    it('parses YYYY.MM.DD version correctly', () => {
      const manifest: BundleManifest = {
        version: '2026.04.12',
        timestamp: new Date().toISOString(),
        documents: [],
        formulary: { entry_count: 0, last_updated: new Date().toISOString() },
        embeddings_model: 'test',
        embeddings_sha256: 'test',
        total_chunks: 0,
        total_embeddings: 0,
      };

      // Should not throw
      expect(isBundleNewer(null, manifest)).toBe(true);
    });

    it('handles leap year transitions', () => {
      const manifest2024_02_29: BundleManifest = {
        version: '2024.02.29',
        timestamp: new Date().toISOString(),
        documents: [],
        formulary: { entry_count: 0, last_updated: new Date().toISOString() },
        embeddings_model: 'test',
        embeddings_sha256: 'test',
        total_chunks: 0,
        total_embeddings: 0,
      };

      const manifest2024_03_01: BundleManifest = {
        ...manifest2024_02_29,
        version: '2024.03.01',
      };

      expect(isBundleNewer('2024.02.29', manifest2024_03_01)).toBe(true);
    });
  });

  describe('Bundle security characteristics', () => {
    it('SHA-256 cannot be reversed (one-way function)', () => {
      const original = 'secret data';
      const hash = sha256(original);

      // Hashes should be deterministic
      expect(sha256(original)).toBe(hash);

      // But slightly different input should produce completely different hash
      const almostSame = 'secret datb';
      expect(sha256(almostSame)).not.toBe(hash);

      // And the difference should be significant (avalanche effect)
      const originalBits = hash
        .split('')
        .map((c) => parseInt(c, 16).toString(2).padStart(4, '0'))
        .join('');
      const differentBits = sha256(almostSame)
        .split('')
        .map((c) => parseInt(c, 16).toString(2).padStart(4, '0'))
        .join('');

      let differentCount = 0;
      for (let i = 0; i < originalBits.length; i++) {
        if (originalBits[i] !== differentBits[i]) differentCount++;
      }

      // Should have significant bit differences (avalanche effect)
      expect(differentCount).toBeGreaterThan(100);
    });
  });
});
