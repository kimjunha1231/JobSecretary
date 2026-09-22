import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; outlineId: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id, outlineId } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await writingSessionService.selectOutline(id, { ...(body as Record<string, unknown> ?? {}), id: outlineId }));
    } catch (error) {
        return errorResponse(error, '개요 선택을 저장하지 못했습니다.');
    }
}
