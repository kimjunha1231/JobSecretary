import { NextResponse } from 'next/server';
import { JobTargetServiceError } from '@/entities/job-target/api';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError || error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await writingSessionService.get(id));
    } catch (error) {
        return errorResponse(error, '작성 세션을 불러오지 못했습니다.');
    }
}
