import { NextResponse } from 'next/server';
import { SourceDocumentServiceError, sourceDocumentService, type ManualTextUpdateInput } from '@/entities/source-document/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await sourceDocumentService.updateManualText(id, (body ?? {}) as ManualTextUpdateInput));
    } catch (error) {
        if (error instanceof SourceDocumentServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Manual source text update failed.', error);
        return NextResponse.json({ error: '자료 본문을 저장하지 못했습니다.' }, { status: 500 });
    }
}
