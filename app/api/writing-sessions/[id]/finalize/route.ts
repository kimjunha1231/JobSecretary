import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await writingSessionService.finalize(id));
    } catch (error) {
        return errorResponse(error, '자기소개서를 최종 확정하지 못했습니다.');
    }
}
