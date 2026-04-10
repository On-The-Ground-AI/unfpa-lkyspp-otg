import { NextRequest, NextResponse } from 'next/server';
import { getLatestBundle, verifyBundleSignature, recordBundleDownload } from '@/services/bundlePublisher';

/**
 * GET /api/mobile/bundle/latest
 *
 * Returns the latest signed OTA content bundle manifest and metadata.
 * Used by mobile apps to check for updates and download new content.
 *
 * Query parameters:
 *   - clientId (optional): For tracking downloads
 *   - appVersion (optional): For compatibility checking
 *   - currentVersion (optional): For comparison
 *
 * Response: {
 *   version: string,
 *   manifest: { documents, formulary, embeddings_model, ... },
 *   signature: string (base64-encoded Ed25519 signature),
 *   publishedAt: ISO 8601,
 *   bundleUrl?: string,
 *   signatureValid: boolean
 * }
 *
 * Error responses:
 *   - 404: No bundle available
 *   - 503: Database unavailable
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || undefined;
    const appVersion = searchParams.get('appVersion') || undefined;
    const currentVersion = searchParams.get('currentVersion') || undefined;

    // Get latest bundle
    const bundle = await getLatestBundle();

    if (!bundle) {
      return NextResponse.json(
        { error: 'No bundle available' },
        { status: 404 }
      );
    }

    // Verify signature
    const verification = verifyBundleSignature(bundle.manifest, bundle.signature);

    // Record download for analytics (asynchronous, don't wait)
    recordBundleDownload(bundle.version, appVersion, {
      clientId,
      currentVersion,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error('Failed to record download:', err));

    // Prepare response
    const response = {
      version: bundle.version,
      manifest: bundle.manifest,
      signature: bundle.signature,
      publishedAt: bundle.publishedAt.toISOString(),
      publishedBy: bundle.publishedBy,
      notes: bundle.notes,
      bundleUrl: bundle.bundleUrl,
      signatureValid: verification.valid,
      signatureError: verification.error,
      manifestHash: verification.manifestHash,
      isUpdate: currentVersion ? currentVersion !== bundle.version : true,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Bundle latest endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve bundle' },
      { status: 503 }
    );
  }
}
