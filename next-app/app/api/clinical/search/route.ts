/**
 * Semantic search API for clinical knowledge base.
 *
 * Endpoint: POST /api/clinical/search
 *
 * Request body:
 * {
 *   query: string (required) - Clinical query
 *   limit?: number - Results to return (default: 5, max: 20)
 *   threshold?: number - Similarity threshold (default: 0.6, range: 0-1)
 *   includeFormulary?: boolean - Include formulary entries (default: true)
 * }
 *
 * Response:
 * {
 *   chunks: ClinicalChunkResult[]
 *   formularyEntries: FormularyResult[]
 *   totalResults: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchClinicalKnowledge } from '@/services/clinicalRagService';
import { logClinicalQuery } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id') || uuidv4();
  const userId = request.headers.get('x-user-id');
  const country = request.headers.get('x-country') || 'unknown';
  const language = request.headers.get('x-language') || 'en';

  try {
    const body = await request.json();
    const { query, limit = 5, threshold = 0.6, includeFormulary = true } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const boundLimit = Math.min(Math.max(1, limit), 20);
    const boundThreshold = Math.max(0, Math.min(1, threshold));

    const results = await searchClinicalKnowledge(query.trim(), {
      limit: boundLimit,
      threshold: boundThreshold,
      includeFormulary,
    });

    // Log the query for audit trail
    const answerText = results.chunks
      .map((c) => c.chunkContent)
      .join('\n---\n');
    const citationIds = results.chunks.map((c) => c.id);

    await logClinicalQuery(
      sessionId,
      query,
      answerText,
      citationIds,
      {
        userId: userId || undefined,
        country,
        language,
        hasDoseCard: results.formularyEntries.length > 0,
        validatorPassed: true,
      }
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Clinical Search API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search clinical knowledge base' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'GET not supported. Use POST with query in request body.' },
    { status: 405 }
  );
}
