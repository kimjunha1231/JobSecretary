import { NextResponse } from 'next/server';
import { PdfExportServiceError, createPdfDownloadResponse, pdfExportService } from '@/entities/export';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const format = new URL(request.url).searchParams.get('format') === 'resume' ? 'resume' : 'portfolio';
        const buffer = await pdfExportService.renderCareerProfile(format);
        return createPdfDownloadResponse(buffer, `${format === 'resume' ? '경력-이력서' : '활동-포트폴리오'}.pdf`);
    } catch (error) {
        if (error instanceof PdfExportServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Career profile PDF export failed.', error);
        return NextResponse.json({ error: '경력 자료 PDF를 만들지 못했습니다.' }, { status: 500 });
    }
}
