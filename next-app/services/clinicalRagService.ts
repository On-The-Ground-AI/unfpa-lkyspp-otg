/**
 * Clinical RAG Service
 *
 * Retrieval-Augmented Generation for clinical queries.
 * - Retrieves relevant clinical chunks from knowledge base
 * - Ranks results by clinical relevance and evidence level
 * - Generates citations with page numbers and source metadata
 * - Validates drug information against formulary
 * - Handles clinical-specific search refinement
 */

import { prisma } from '@/lib/prisma';
import { generateEmbedding, isEmbeddingAvailable } from './embeddingService';
import type { KnowledgeSearchResult } from '@/types/corpus';

export interface ClinicalSearchOptions {
  limit?: number;
  threshold?: number;
  includeFormulary?: boolean;
  vertical?: string;
  evidenceLevel?: 'guideline' | 'protocol' | 'all';
}

export interface ClinicalChunkResult extends KnowledgeSearchResult {
  id?: string; // Chunk ID from database
  sourceDocument?: string;
  sourceSection?: string;
  sourcePage?: number;
  sourceUrl?: string;
  clinicalRelevanceScore?: number;
  isFormularyVerified?: boolean;
  evidenceLevel?: string;
}

export interface FormularyResult {
  id: string;
  drug: string;
  dose: string;
  route: string;
  indication: string;
  contraindications?: string[];
  warnings?: string[];
  source: string;
  whoEmlListed: boolean;
  sourceChunkSlug?: string;
}

export interface ClinicalSearchResults {
  chunks: ClinicalChunkResult[];
  formularyEntries: FormularyResult[];
  totalResults: number;
}

/**
 * Semantic search over clinical knowledge base with ranking by clinical relevance.
 */
export async function searchClinicalKnowledge(
  query: string,
  options?: ClinicalSearchOptions
): Promise<ClinicalSearchResults> {
  const limit = options?.limit || 5;
  const threshold = options?.threshold || 0.6;
  const includeFormulary = options?.includeFormulary !== false;

  if (!isEmbeddingAvailable()) {
    return {
      chunks: [],
      formularyEntries: [],
      totalResults: 0,
    };
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.embedding.join(',')}]`;

  // Search knowledge chunks with clinical metadata
  let sql = `
    SELECT
      kc.id,
      kc.content,
      kc.chunk_index,
      kd.slug as document_slug,
      kd.title as document_title,
      kc.source_document,
      kc.source_section,
      kc.source_page,
      kc.source_url,
      1 - (kc.embedding <=> $1::vector) as similarity,
      cs.short_name as clinical_source_name,
      cs.edition as clinical_source_edition
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    LEFT JOIN clinical_sources cs ON cs.id = kc.clinical_source_id
    WHERE kc.embedding IS NOT NULL
      AND 1 - (kc.embedding <=> $1::vector) >= $2
  `;

  const params: unknown[] = [embeddingStr, threshold];
  let paramIndex = 3;

  if (options?.vertical) {
    sql += ` AND kd.vertical = $${paramIndex}`;
    params.push(options.vertical);
    paramIndex++;
  }

  // Prefer clinical content (chunks with source_document metadata)
  sql += `
    ORDER BY
      (CASE WHEN kc.source_document IS NOT NULL THEN 1 ELSE 0 END) DESC,
      1 - (kc.embedding <=> $1::vector) DESC
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  const rawResults = await prisma.$queryRawUnsafe(
    sql,
    ...params
  ) as Array<{
    id: string;
    content: string;
    chunk_index: number;
    document_slug: string;
    document_title: string;
    source_document?: string;
    source_section?: string;
    source_page?: number;
    source_url?: string;
    similarity: number;
    clinical_source_name?: string;
    clinical_source_edition?: string;
  }>;

  const chunks: ClinicalChunkResult[] = rawResults.map((r) => {
    // Calculate clinical relevance score based on presence of citation metadata
    const hasCitationMetadata = !!(r.source_document || r.source_page);
    const clinicalRelevanceScore = hasCitationMetadata ? r.similarity * 1.1 : r.similarity;

    return {
      id: r.id,
      documentSlug: r.document_slug,
      documentTitle: r.document_title,
      chunkIndex: r.chunk_index,
      chunkContent: r.content,
      similarity: Number(r.similarity),
      sourceDocument: r.source_document,
      sourceSection: r.source_section,
      sourcePage: r.source_page,
      sourceUrl: r.source_url,
      clinicalRelevanceScore: Math.min(clinicalRelevanceScore, 1.0),
      evidenceLevel: r.source_document ? 'guideline' : 'general',
    };
  });

  // Search formulary if requested
  let formularyEntries: FormularyResult[] = [];
  if (includeFormulary) {
    // Extract drug names from query (simple heuristic)
    const drugNames = extractDrugNamesFromQuery(query);
    if (drugNames.length > 0) {
      formularyEntries = await searchFormulary(drugNames);
    }
  }

  return {
    chunks,
    formularyEntries,
    totalResults: chunks.length + formularyEntries.length,
  };
}

/**
 * Search formulary by drug name, indication, or both.
 */
export async function searchFormulary(
  drugNames: string[],
  options?: { limit?: number }
): Promise<FormularyResult[]> {
  const limit = options?.limit || 10;

  if (drugNames.length === 0) return [];

  // Case-insensitive search for drug names
  const entries = await prisma.formularyEntry.findMany({
    where: {
      OR: drugNames.map((name) => ({
        drug: { contains: name, mode: 'insensitive' },
      })),
    },
    take: limit,
    orderBy: { reviewedAt: 'desc' },
  });

  return entries.map((e: any) => ({
    id: e.id,
    drug: e.drug,
    dose: e.dose,
    route: e.route,
    indication: e.indication,
    contraindications: (e.contraindications as string[] | null) || undefined,
    warnings: (e.warnings as string[] | null) || undefined,
    source: e.source,
    whoEmlListed: e.whoEmlListed,
    sourceChunkSlug: e.sourceChunkSlug || undefined,
  }));
}

/**
 * Search clinical guidelines by condition or procedure.
 * Example: "what is the protocol for PPH?" → searches for PPH guidelines.
 */
export async function searchClinicalGuidelines(
  condition: string,
  options?: ClinicalSearchOptions
): Promise<ClinicalChunkResult[]> {
  // Enhance query with clinical-specific terms
  const enhancedQuery = enhanceClinicaleQuery(condition);
  const results = await searchClinicalKnowledge(enhancedQuery, {
    ...options,
    evidenceLevel: 'guideline',
  });
  return results.chunks;
}

/**
 * Get a formulary entry by drug name with clinical validation.
 */
export async function getFormularyEntry(drugName: string): Promise<FormularyResult | null> {
  const entry = await prisma.formularyEntry.findFirst({
    where: {
      drug: { equals: drugName, mode: 'insensitive' },
    },
  });

  if (!entry) return null;

  return {
    id: entry.id,
    drug: entry.drug,
    dose: entry.dose,
    route: entry.route,
    indication: entry.indication,
    contraindications: (entry.contraindications as string[] | null) || undefined,
    warnings: (entry.warnings as string[] | null) || undefined,
    source: entry.source,
    whoEmlListed: entry.whoEmlListed,
    sourceChunkSlug: entry.sourceChunkSlug || undefined,
  };
}

/**
 * Validate that cited drug information matches formulary data.
 * Returns warnings if discrepancies are found.
 */
export async function validateDrugCitation(
  drug: string,
  dose: string,
  route: string
): Promise<{ valid: boolean; warnings: string[] }> {
  const entry = await getFormularyEntry(drug);
  const warnings: string[] = [];

  if (!entry) {
    warnings.push(`Drug "${drug}" not found in verified formulary.`);
    return { valid: false, warnings };
  }

  // Check dose matches
  if (!entry.dose.toLowerCase().includes(dose.toLowerCase())) {
    warnings.push(`Dose "${dose}" differs from formulary entry "${entry.dose}".`);
  }

  // Check route matches
  if (!entry.route.toLowerCase().includes(route.toLowerCase())) {
    warnings.push(`Route "${route}" differs from formulary entry "${entry.route}".`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Extract suspected drug names from a clinical query.
 * Uses simple pattern matching and common drug names.
 */
function extractDrugNamesFromQuery(query: string): string[] {
  const commonDrugs = [
    'oxytocin',
    'magnesium sulfate',
    'misoprostol',
    'mifepristone',
    'ergot',
    'ergotamine',
    'methylergonovine',
    'prostaglandin',
    'artemisinin',
    'quinine',
    'chloroquine',
    'amodiaquine',
    'artemether',
    'amoxicillin',
    'ampicillin',
    'cephalosporin',
    'penicillin',
    'gentamicin',
    'azithromycin',
    'metronidazole',
    'ibuprofen',
    'acetaminophen',
    'paracetamol',
    'aspirin',
    'naproxen',
    'diclofenac',
    'morphine',
    'codeine',
    'tramadol',
    'hydralazine',
    'nifedipine',
    'labetalol',
    'methyldopa',
    'atenolol',
    'amlodipine',
    'lisinopril',
    'enalapril',
  ];

  const lowerQuery = query.toLowerCase();
  const found: string[] = [];

  for (const drug of commonDrugs) {
    if (lowerQuery.includes(drug)) {
      found.push(drug);
    }
  }

  return [...new Set(found)]; // Remove duplicates
}

/**
 * Enhance a clinical query with standard terminology.
 * Example: "PPH" → "postpartum hemorrhage"
 */
function enhanceClinicaleQuery(query: string): string {
  const clinicalAbbreviations: Record<string, string> = {
    PPH: 'postpartum hemorrhage',
    'AMTSL': 'active management third stage labour',
    'OASIS': 'obstetric anal sphincter injuries',
    'GBS': 'group B streptococcus',
    'HIV': 'human immunodeficiency virus',
    'TB': 'tuberculosis',
    'STI': 'sexually transmitted infection',
    'ANC': 'antenatal care',
    'PNC': 'postnatal care',
    'SBA': 'skilled birth attendance',
    'EmOC': 'emergency obstetric care',
    'MEC': 'medical eligibility criteria',
    'FP': 'family planning',
    'MISP': 'minimum initial service package',
    'EML': 'essential medicines list',
    'WHO': 'World Health Organization',
  };

  let enhanced = query;
  for (const [abbr, full] of Object.entries(clinicalAbbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    enhanced = enhanced.replace(regex, full);
  }

  return enhanced;
}

/**
 * Format a clinical search result with full citation information.
 */
export function formatClinicalCitation(result: ClinicalChunkResult): string {
  const parts: string[] = [];

  if (result.sourceDocument) {
    parts.push(`${result.sourceDocument}`);
  }
  if (result.sourceSection) {
    parts.push(`${result.sourceSection}`);
  }
  if (result.sourcePage) {
    parts.push(`p. ${result.sourcePage}`);
  }

  if (parts.length === 0) {
    return `${result.documentTitle}`;
  }

  return `${parts.join(', ')} (${result.documentTitle})`;
}

/**
 * Log a clinical query and answer for audit purposes.
 */
export async function logClinicalAnswer(
  sessionId: string,
  mode: 'clinical' | 'community',
  query: string,
  answer: string,
  citationChunkIds: string[],
  options?: {
    country?: string;
    language?: string;
    hasDoseCard?: boolean;
    validatorPassed?: boolean;
    validatorWarnings?: string[];
  }
): Promise<void> {
  try {
    await prisma.clinicalDisclaimerLog.create({
      data: {
        sessionId,
        mode,
        country: options?.country,
        language: options?.language,
        question: query,
        answer,
        citationChunkIds,
        hasDoseCard: options?.hasDoseCard || false,
        validatorPassed: options?.validatorPassed !== false,
        validatorWarnings: options?.validatorWarnings || [],
      },
    });
  } catch (error) {
    console.error('[ClinicalRAG] Failed to log clinical answer:', error);
    // Don't throw — logging failure shouldn't break user experience
  }
}
