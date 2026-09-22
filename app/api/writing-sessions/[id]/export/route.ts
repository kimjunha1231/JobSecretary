import { NextResponse } from 'next/server';
import { PdfExportServiceError, createPdfDownloadResponse, pdfExportService } from '@/entities/export';
import { WritingSessionServiceError } from '@/entities/writing-session/api';
import { JobTargetServiceError } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown): NextResponse {
    if (error instanceof PdfExportServiceError || error instanceof WritingSessionServiceError || error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Writing session PDF export failed.', error);
    return NextResponse.json({ error: '자기소개서 PDF를 만들지 못했습니다.' }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const buffer = await pdfExportService.renderWritingSession(id);
        return createPdfDownloadResponse(buffer, `자기소개서-${id}.pdf`);
    } catch (error) {
        return errorResponse(error);
    }
}
