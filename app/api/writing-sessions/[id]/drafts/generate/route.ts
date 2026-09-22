import { NextResponse } from 'next/server';
import { WritingGenerationError, generateDraftCandidates } from '@/features/writing-studio/api';
import { AiAccessError } from '@/shared/lib/ai-access';
import { WritingSessionServiceError } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingGenerationError || error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AiAccessError) {
        return NextResponse.json(
            { error: error.message },
            { status: error.code === 'RATE_LIMITED' ? 429 : 401, headers: error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined },
        );
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await generateDraftCandidates(id));
    } catch (error) {
        return errorResponse(error, '초안 후보를 생성하지 못했습니다.');
    }
}
