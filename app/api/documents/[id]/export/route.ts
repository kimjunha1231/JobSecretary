import { NextResponse } from 'next/server';
import { PdfExportServiceError, createPdfDownloadResponse, pdfExportService } from '@/entities/export';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const buffer = await pdfExportService.renderLegacyDocument(id);
        return createPdfDownloadResponse(buffer, `자기소개서-${id}.pdf`);
    } catch (error) {
        if (error instanceof PdfExportServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Legacy document PDF export failed.', error);
        return NextResponse.json({ error: '문서 PDF를 만들지 못했습니다.' }, { status: 500 });
    }
}
