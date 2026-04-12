/**
 * Audit Logging Service
 *
 * Centralized logging for clinical queries, drug lookups, and protocol access.
 * Used by web app, Android, and iOS to track clinical decision support usage.
 *
 * Logs are stored in clinicalDisclaimerLog table with:
 * - sessionId: Unique session identifier (from client)
 * - mode: 'clinical' or 'community' mode
 * - userId (optional): If authenticated
 * - country, language: Localization context
 * - query/question: What the user asked
 * - answer: What was returned
 * - citationChunkIds: References to knowledge base chunks
 * - validatorPassed: Whether drug info validation passed
 * - validatorWarnings: Any warnings from validation
 * - hasDoseCard: Whether dose card info was included
 * - timestamp: ISO 8601 timestamp
 *
 * Purpose: Audit trail for clinical governance, safety monitoring, usage analytics
 */

import { prisma } from '@/lib/prisma';

export interface AuditLogOptions {
  userId?: string;
  country?: string;
  language?: string;
  hasDoseCard?: boolean;
  validatorPassed?: boolean;
  validatorWarnings?: string[];
  citationChunkIds?: string[];
  timestamp?: Date;
}

export interface DrugLookupAuditOptions {
  userId?: string;
  country?: string;
  language?: string;
  resultFound?: boolean;
  resultCount?: number;
  timestamp?: Date;
}

export interface ProtocolAccessAuditOptions {
  userId?: string;
  country?: string;
  language?: string;
  protocolType?: string;
  timestamp?: Date;
}

/**
 * Log a clinical query and answer for audit/safety monitoring.
 * Called whenever a user performs a clinical search.
 *
 * Example:
 * ```typescript
 * await logClinicalQuery(
 *   sessionId: "session_abc123",
 *   query: "management of postpartum hemorrhage",
 *   answer: "Medical management: oxytocin 10 IU IV...",
 *   citationChunkIds: ["chunk_1", "chunk_2"],
 *   {
 *     userId: "user_123",
 *     country: "Uganda",
 *     language: "en",
 *     validatorPassed: true
 *   }
 * );
 * ```
 */
export async function logClinicalQuery(
  sessionId: string,
  query: string,
  answer: string,
  citationChunkIds: string[] = [],
  options?: AuditLogOptions
): Promise<void> {
  try {
    await prisma.clinicalDisclaimerLog.create({
      data: {
        sessionId,
        mode: 'clinical',
        userId: options?.userId,
        country: options?.country,
        language: options?.language || 'en',
        question: query,
        answer,
        citationChunkIds,
        hasDoseCard: options?.hasDoseCard || false,
        validatorPassed: options?.validatorPassed !== false,
        validatorWarnings: options?.validatorWarnings || [],
        createdAt: options?.timestamp || new Date(),
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to log clinical query:', error);
    // Don't throw — logging failure shouldn't break user experience
  }
}

/**
 * Log a drug formulary lookup.
 * Called whenever a user searches for drug information.
 *
 * Example:
 * ```typescript
 * await logDrugLookup(
 *   sessionId: "session_abc123",
 *   drug: "oxytocin",
 *   {
 *     userId: "user_123",
 *     country: "Uganda",
 *     resultFound: true,
 *     resultCount: 1
 *   }
 * );
 * ```
 */
export async function logDrugLookup(
  sessionId: string,
  drug: string,
  options?: DrugLookupAuditOptions
): Promise<void> {
  try {
    const answer = options?.resultFound
      ? `Found ${options?.resultCount || 1} result(s) for drug: ${drug}`
      : `No results found for drug: ${drug}`;

    await prisma.clinicalDisclaimerLog.create({
      data: {
        sessionId,
        mode: 'clinical',
        userId: options?.userId,
        country: options?.country,
        language: options?.language || 'en',
        question: `Drug lookup: ${drug}`,
        answer,
        citationChunkIds: [],
        hasDoseCard: true,
        validatorPassed: true,
        validatorWarnings: [],
        createdAt: options?.timestamp || new Date(),
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to log drug lookup:', error);
    // Don't throw — logging failure shouldn't break user experience
  }
}

/**
 * Log access to clinical protocols/guidelines.
 * Called when user accesses emergency protocols, decision trees, etc.
 *
 * Example:
 * ```typescript
 * await logProtocolAccess(
 *   sessionId: "session_abc123",
 *   protocol: "postpartum-hemorrhage-management",
 *   context: "emergency_page",
 *   {
 *     userId: "user_123",
 *     country: "Uganda"
 *   }
 * );
 * ```
 */
export async function logProtocolAccess(
  sessionId: string,
  protocol: string,
  context: string,
  options?: ProtocolAccessAuditOptions
): Promise<void> {
  try {
    await prisma.clinicalDisclaimerLog.create({
      data: {
        sessionId,
        mode: 'clinical',
        userId: options?.userId,
        country: options?.country,
        language: options?.language || 'en',
        question: `Protocol access: ${protocol}`,
        answer: `Accessed ${options?.protocolType || 'protocol'}: ${protocol} from ${context}`,
        citationChunkIds: [],
        hasDoseCard: false,
        validatorPassed: true,
        validatorWarnings: [],
        createdAt: options?.timestamp || new Date(),
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to log protocol access:', error);
    // Don't throw — logging failure shouldn't break user experience
  }
}

/**
 * Get audit logs for a specific session (for debugging/review).
 * Used for post-incident review and quality assurance.
 */
export async function getSessionLogs(
  sessionId: string
): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  validatorPassed: boolean;
  createdAt: Date;
}> | null> {
  try {
    const logs = await prisma.clinicalDisclaimerLog.findMany({
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
    return logs;
  } catch (error) {
    console.error('[AuditLog] Failed to retrieve session logs:', error);
    return null;
  }
}

/**
 * Get audit statistics for a date range (for analytics/governance review).
 * Returns aggregated usage patterns.
 */
export async function getAuditStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalQueries: number;
  totalDrugLookups: number;
  queriesByCountry: Record<string, number>;
  queriesByLanguage: Record<string, number>;
  validatorPassRate: number;
  averageAnswerLength: number;
} | null> {
  try {
    const logs = await prisma.clinicalDisclaimerLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        question: true,
        answer: true,
        country: true,
        language: true,
        validatorPassed: true,
      },
    });

    if (logs.length === 0) {
      return {
        totalQueries: 0,
        totalDrugLookups: 0,
        queriesByCountry: {},
        queriesByLanguage: {},
        validatorPassRate: 0,
        averageAnswerLength: 0,
      };
    }

    const drugLookups = logs.filter((l) => l.question.includes('Drug lookup:')).length;
    const clinicalQueries = logs.length - drugLookups;

    const countryCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};
    let validatorPass = 0;
    let totalLength = 0;

    for (const log of logs) {
      if (log.country) {
        countryCounts[log.country] = (countryCounts[log.country] || 0) + 1;
      }
      if (log.language) {
        languageCounts[log.language] = (languageCounts[log.language] || 0) + 1;
      }
      if (log.validatorPassed) {
        validatorPass++;
      }
      totalLength += log.answer?.length || 0;
    }

    return {
      totalQueries: clinicalQueries,
      totalDrugLookups: drugLookups,
      queriesByCountry: countryCounts,
      queriesByLanguage: languageCounts,
      validatorPassRate: logs.length > 0 ? validatorPass / logs.length : 0,
      averageAnswerLength: logs.length > 0 ? totalLength / logs.length : 0,
    };
  } catch (error) {
    console.error('[AuditLog] Failed to get audit statistics:', error);
    return null;
  }
}

/**
 * Export audit logs as CSV for external analysis/compliance reporting.
 * Includes all fields for regulatory review.
 */
export async function exportAuditLogsCsv(
  startDate: Date,
  endDate: Date
): Promise<string | null> {
  try {
    const logs = await prisma.clinicalDisclaimerLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) {
      return 'No logs found for date range';
    }

    // CSV header
    const headers = [
      'Timestamp',
      'Session ID',
      'User ID',
      'Mode',
      'Country',
      'Language',
      'Question',
      'Answer Length',
      'Validator Passed',
      'Validator Warnings',
      'Dose Card Included',
    ];

    // CSV rows
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.sessionId,
      log.userId || '',
      log.mode,
      log.country || '',
      log.language || 'en',
      `"${log.question.replace(/"/g, '""')}"`, // Escape quotes
      log.answer?.length || 0,
      log.validatorPassed ? 'Yes' : 'No',
      `"${(log.validatorWarnings || []).join('; ')}"`,
      log.hasDoseCard ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  } catch (error) {
    console.error('[AuditLog] Failed to export audit logs:', error);
    return null;
  }
}
