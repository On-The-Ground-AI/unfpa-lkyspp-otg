import { NextRequest, NextResponse } from 'next/server';
import {
  generateDocx,
  generatePdf,
  generatePptx,
  type ExportMessage,
  type ExportFormat,
} from '@/services/exportService';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MIME_TYPES: Record<ExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const FILE_EXTENSIONS: Record<ExportFormat, string> = {
  docx: 'docx',
  pdf: 'pdf',
  pptx: 'pptx',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, format, title } = body as {
      messages: ExportMessage[];
      format: ExportFormat;
      title?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!format || !['docx', 'pdf', 'pptx'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be one of: docx, pdf, pptx' },
        { status: 400 }
      );
    }

    // Validate messages structure
    for (const msg of messages) {
      if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
        return NextResponse.json(
          { error: 'Each message must have a valid role (user/assistant) and content' },
          { status: 400 }
        );
      }
    }

    let buffer: Buffer;

    switch (format) {
      case 'docx':
        buffer = await generateDocx(messages, title);
        break;
      case 'pdf':
        buffer = await generatePdf(messages, title);
        break;
      case 'pptx':
        buffer = await generatePptx(messages, title);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `unfpa-report-${timestamp}.${FILE_EXTENSIONS[format]}`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': MIME_TYPES[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export. Please try again.' },
      { status: 500 }
    );
  }
}
