/**
 * Drug formulary lookup API.
 *
 * Endpoint: POST /api/clinical/formulary
 *
 * Request body:
 * {
 *   drugs?: string[] - Drug names to search (e.g., ["oxytocin", "misoprostol"])
 *   searchTerm?: string - Single drug name or indication to search
 *   limit?: number - Max results (default: 10)
 * }
 *
 * Response:
 * {
 *   entries: FormularyResult[]
 *   totalResults: number
 *   warning?: string - Notes about limitations (e.g., "Not all drugs present in formulary")
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchFormulary, getFormularyEntry } from '@/services/clinicalRagService';
import { logDrugLookup } from '@/lib/auditLog';
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
    const { drugs, searchTerm, limit = 10 } = body;

    let drugNames: string[] = [];

    if (searchTerm && typeof searchTerm === 'string') {
      drugNames = [searchTerm.trim()];
    } else if (Array.isArray(drugs)) {
      drugNames = drugs
        .map((d: unknown) => (typeof d === 'string' ? d.trim() : ''))
        .filter(Boolean);
    }

    if (drugNames.length === 0) {
      return NextResponse.json(
        { error: 'At least one drug name is required (drugs array or searchTerm string)' },
        { status: 400 }
      );
    }

    const boundLimit = Math.min(Math.max(1, limit), 100);
    const entries = await searchFormulary(drugNames, { limit: boundLimit });

    // Log drug lookups for audit trail
    for (const drugName of drugNames) {
      await logDrugLookup(sessionId, drugName, {
        userId: userId || undefined,
        country,
        language,
        resultFound: entries.length > 0,
        resultCount: entries.length,
      });
    }

    return NextResponse.json({
      entries,
      totalResults: entries.length,
      warning:
        entries.length === 0
          ? 'No formulary entries found. Please consult your facility reference materials.'
          : undefined,
    });
  } catch (error) {
    console.error('[Clinical Formulary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search formulary' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET with query parameters for simple drug lookups
  const sessionId = request.headers.get('x-session-id') || uuidv4();
  const userId = request.headers.get('x-user-id');
  const country = request.headers.get('x-country') || 'unknown';
  const language = request.headers.get('x-language') || 'en';

  const searchParams = request.nextUrl.searchParams;
  const drug = searchParams.get('drug');

  if (!drug) {
    return NextResponse.json(
      { error: 'Drug name required (use ?drug=name query parameter)' },
      { status: 400 }
    );
  }

  try {
    const entry = await getFormularyEntry(drug);

    // Log drug lookup for audit trail
    await logDrugLookup(sessionId, drug, {
      userId: userId || undefined,
      country,
      language,
      resultFound: entry !== null,
      resultCount: entry ? 1 : 0,
    });

    if (!entry) {
      return NextResponse.json(
        { entry: null, warning: 'Drug not found in formulary' },
        { status: 404 }
      );
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('[Clinical Formulary GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve formulary entry' },
      { status: 500 }
    );
  }
}
