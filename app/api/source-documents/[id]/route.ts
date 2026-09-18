import { NextResponse } from 'next/server';
import { SourceDocumentServiceError, sourceDocumentService } from '@/entities/source-document/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type SourceDocumentRouteContext = {
    params: Promise<{ id: string }>;
};

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof SourceDocumentServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: SourceDocumentRouteContext) {
    try {
        const { id } = await params;
        const result = await sourceDocumentService.get(id);
        if (!result) {
            return NextResponse.json({ error: '자료를 찾을 수 없습니다.' }, { status: 404 });
        }
        return NextResponse.json(result);
    } catch (error) {
        return errorResponse(error, '자료를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request, { params }: SourceDocumentRouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const document = await sourceDocumentService.updateStatus(id, body);
        return NextResponse.json({ ...document, rawText: undefined });
    } catch (error) {
        return errorResponse(error, '검수 상태를 저장하지 못했습니다.');
    }
}
