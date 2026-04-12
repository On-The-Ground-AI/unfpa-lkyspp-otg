/**
 * Clinical guidelines retrieval API.
 *
 * Endpoint: POST /api/clinical/guidelines
 *
 * Request body:
 * {
 *   condition: string (required) - Clinical condition or procedure
 *   limit?: number - Results to return (default: 3)
 *   threshold?: number - Similarity threshold (default: 0.65)
 * }
 *
 * Response:
 * {
 *   guidelines: ClinicalChunkResult[]
 *   condition: string
 *   totalResults: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchClinicalGuidelines } from '@/services/clinicalRagService';
import { logProtocolAccess } from '@/lib/auditLog';
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
    const { condition, limit = 3, threshold = 0.65 } = body;

    if (!condition || typeof condition !== 'string' || condition.trim().length === 0) {
      return NextResponse.json(
        { error: 'Condition is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const boundLimit = Math.min(Math.max(1, limit), 20);
    const boundThreshold = Math.max(0.5, Math.min(1, threshold)); // Higher threshold for guidelines

    const guidelines = await searchClinicalGuidelines(condition.trim(), {
      limit: boundLimit,
      threshold: boundThreshold,
    });

    // Log protocol access for audit trail
    await logProtocolAccess(
      sessionId,
      condition.trim(),
      'guidelines-api',
      {
        userId: userId || undefined,
        country,
        language,
        protocolType: 'clinical-guideline',
      }
    );

    return NextResponse.json({
      guidelines,
      condition: condition.trim(),
      totalResults: guidelines.length,
    });
  } catch (error) {
    console.error('[Clinical Guidelines API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve clinical guidelines' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id') || uuidv4();
  const userId = request.headers.get('x-user-id');
  const country = request.headers.get('x-country') || 'unknown';
  const language = request.headers.get('x-language') || 'en';

  const searchParams = request.nextUrl.searchParams;
  const condition = searchParams.get('condition');
  const limit = parseInt(searchParams.get('limit') || '3', 10);
  const threshold = parseFloat(searchParams.get('threshold') || '0.65');

  if (!condition) {
    return NextResponse.json(
      { error: 'Condition required (use ?condition=name query parameter)' },
      { status: 400 }
    );
  }

  try {
    const guidelines = await searchClinicalGuidelines(condition, {
      limit,
      threshold,
    });

    // Log protocol access for audit trail
    await logProtocolAccess(
      sessionId,
      condition,
      'guidelines-get-api',
      {
        userId: userId || undefined,
        country,
        language,
        protocolType: 'clinical-guideline',
      }
    );

    return NextResponse.json({
      guidelines,
      condition,
      totalResults: guidelines.length,
    });
  } catch (error) {
    console.error('[Clinical Guidelines GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve clinical guidelines' },
      { status: 500 }
    );
  }
}
