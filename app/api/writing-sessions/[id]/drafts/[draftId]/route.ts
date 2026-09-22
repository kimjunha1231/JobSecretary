import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; draftId: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id, draftId } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        if (body && typeof body === 'object' && 'content' in body) {
            return NextResponse.json(await writingSessionService.updateSelectedDraft(id, { ...(body as { content: string }), draftId }));
        }
        return NextResponse.json(await writingSessionService.selectDraft(id, { ...(body as Record<string, unknown> ?? {}), id: draftId }));
    } catch (error) {
        return errorResponse(error, '초안 선택 또는 저장에 실패했습니다.');
    }
}
