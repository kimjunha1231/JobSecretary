import { NextResponse } from 'next/server';
import { SourceDocumentServiceError, sourceDocumentService } from '@/entities/source-document/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SourceDocumentRouteContext = {
    params: Promise<{ id: string }>;
};

function errorResponse(error: unknown): NextResponse {
    if (error instanceof SourceDocumentServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Source document original download failed.', error);
    return NextResponse.json({ error: '원본 파일을 불러오지 못했습니다.' }, { status: 500 });
}

export async function GET(_request: Request, { params }: SourceDocumentRouteContext) {
    try {
        const { id } = await params;
        const signedUrl = await sourceDocumentService.createOriginalDownloadUrl(id);
        return NextResponse.redirect(signedUrl, 303);
    } catch (error) {
        return errorResponse(error);
    }
}
