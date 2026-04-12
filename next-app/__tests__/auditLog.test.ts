import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logClinicalQuery,
  logDrugLookup,
  logProtocolAccess,
  getSessionLogs,
  getAuditStats,
  exportAuditLogsCsv,
} from '@/lib/auditLog';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    clinicalDisclaimerLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Audit Logging Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logClinicalQuery', () => {
    it('logs a clinical query with required parameters', async () => {
      const sessionId = 'sess_test_123';
      const query = 'postpartum hemorrhage management';
      const answer = 'Medical management: oxytocin 10 IU IV...';
      const citationIds = ['chunk_1', 'chunk_2'];

      await logClinicalQuery(sessionId, query, answer, citationIds, {
        userId: 'user_123',
        country: 'Uganda',
        language: 'en',
        hasDoseCard: true,
        validatorPassed: true,
      });

      expect(prisma.clinicalDisclaimerLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          mode: 'clinical',
          userId: 'user_123',
          country: 'Uganda',
          language: 'en',
          question: query,
          answer,
          citationChunkIds: citationIds,
          hasDoseCard: true,
          validatorPassed: true,
          validatorWarnings: [],
        }),
      });
    });

    it('handles missing optional parameters gracefully', async () => {
      const sessionId = 'sess_test_456';
      const query = 'drug interaction';
      const answer = 'Checking interactions...';

      await logClinicalQuery(sessionId, query, answer);

      expect(prisma.clinicalDisclaimerLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          mode: 'clinical',
          userId: undefined,
          language: 'en',
          hasDoseCard: false,
          validatorPassed: true,
        }),
      });
    });

    it('does not throw on database errors', async () => {
      vi.mocked(prisma.clinicalDisclaimerLog.create).mockRejectedValueOnce(
        new Error('Database error')
      );

      // Should not throw
      await expect(
        logClinicalQuery('sess_123', 'query', 'answer')
      ).resolves.toBeUndefined();
    });
  });

  describe('logDrugLookup', () => {
    it('logs a drug lookup with result found', async () => {
      const sessionId = 'sess_drug_123';
      const drug = 'oxytocin';

      await logDrugLookup(sessionId, drug, {
        userId: 'user_123',
        country: 'Kenya',
        resultFound: true,
        resultCount: 1,
      });

      expect(prisma.clinicalDisclaimerLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          mode: 'clinical',
          userId: 'user_123',
          country: 'Kenya',
          question: `Drug lookup: ${drug}`,
          answer: expect.stringContaining('Found 1 result(s)'),
          hasDoseCard: true,
        }),
      });
    });

    it('logs a drug lookup with no results', async () => {
      const sessionId = 'sess_drug_456';
      const drug = 'nonexistent_drug';

      await logDrugLookup(sessionId, drug, {
        resultFound: false,
      });

      expect(prisma.clinicalDisclaimerLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          question: `Drug lookup: ${drug}`,
          answer: expect.stringContaining('No results found'),
        }),
      });
    });
  });

  describe('logProtocolAccess', () => {
    it('logs protocol access', async () => {
      const sessionId = 'sess_proto_123';
      const protocol = 'postpartum-hemorrhage-management';
      const context = 'emergency_page';

      await logProtocolAccess(sessionId, protocol, context, {
        userId: 'user_123',
        country: 'Tanzania',
        protocolType: 'emergency',
      });

      expect(prisma.clinicalDisclaimerLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId,
          mode: 'clinical',
          userId: 'user_123',
          country: 'Tanzania',
          question: `Protocol access: ${protocol}`,
          answer: `Accessed emergency: ${protocol} from ${context}`,
        }),
      });
    });
  });

  describe('getSessionLogs', () => {
    it('retrieves session logs', async () => {
      const sessionId = 'sess_retrieve_123';
      const mockLogs = [
        {
          id: 'log_1',
          question: 'test query 1',
          answer: 'test answer 1',
          validatorPassed: true,
          createdAt: new Date(),
        },
        {
          id: 'log_2',
          question: 'test query 2',
          answer: 'test answer 2',
          validatorPassed: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockResolvedValueOnce(
        mockLogs as any
      );

      const result = await getSessionLogs(sessionId);

      expect(result).toEqual(mockLogs);
      expect(prisma.clinicalDisclaimerLog.findMany).toHaveBeenCalledWith({
        where: { sessionId },
        select: {
          id: true,
          question: true,
          answer: true,
          validatorPassed: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('returns null on error', async () => {
      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await getSessionLogs('sess_error_123');
      expect(result).toBeNull();
    });
  });

  describe('getAuditStats', () => {
    it('calculates audit statistics', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const mockLogs = [
        {
          question: 'Clinical query 1',
          answer: 'Answer text here',
          country: 'Uganda',
          language: 'en',
          validatorPassed: true,
        },
        {
          question: 'Drug lookup: oxytocin',
          answer: 'Found 1 result',
          country: 'Uganda',
          language: 'en',
          validatorPassed: true,
        },
        {
          question: 'Clinical query 2',
          answer: 'More answer text',
          country: 'Kenya',
          language: 'sw',
          validatorPassed: false,
        },
      ];

      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockResolvedValueOnce(
        mockLogs as any
      );

      const stats = await getAuditStats(startDate, endDate);

      expect(stats).toEqual({
        totalQueries: 2,
        totalDrugLookups: 1,
        queriesByCountry: { Uganda: 2, Kenya: 1 },
        queriesByLanguage: { en: 2, sw: 1 },
        validatorPassRate: 2 / 3,
        averageAnswerLength: expect.any(Number),
      });
    });

    it('returns empty stats for date range with no logs', async () => {
      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockResolvedValueOnce([]);

      const stats = await getAuditStats(new Date('2020-01-01'), new Date('2020-12-31'));

      expect(stats).toEqual({
        totalQueries: 0,
        totalDrugLookups: 0,
        queriesByCountry: {},
        queriesByLanguage: {},
        validatorPassRate: 0,
        averageAnswerLength: 0,
      });
    });
  });

  describe('exportAuditLogsCsv', () => {
    it('exports logs as CSV', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      const mockLogs = [
        {
          createdAt: new Date('2026-06-15T10:30:00Z'),
          sessionId: 'sess_123',
          userId: 'user_123',
          mode: 'clinical',
          country: 'Uganda',
          language: 'en',
          question: 'postpartum hemorrhage',
          answer: 'Detailed answer about PPH management',
          validatorPassed: true,
          validatorWarnings: [],
          hasDoseCard: true,
        },
      ];

      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockResolvedValueOnce(
        mockLogs as any
      );

      const csv = await exportAuditLogsCsv(startDate, endDate);

      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Session ID');
      expect(csv).toContain('User ID');
      expect(csv).toContain('2026-06-15');
      expect(csv).toContain('sess_123');
      expect(csv).toContain('postpartum hemorrhage');
    });

    it('handles no logs gracefully', async () => {
      vi.mocked(prisma.clinicalDisclaimerLog.findMany).mockResolvedValueOnce([]);

      const csv = await exportAuditLogsCsv(
        new Date('2020-01-01'),
        new Date('2020-12-31')
      );

      expect(csv).toBe('No logs found for date range');
    });
  });
});
