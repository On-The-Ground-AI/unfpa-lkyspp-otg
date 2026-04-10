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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
