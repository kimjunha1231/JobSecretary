import { NextRequest, NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService, type WritingSessionCreateInput } from '@/entities/writing-session/api';
import { JobTargetServiceError } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError || error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        return NextResponse.json(await writingSessionService.list({ limit: searchParams.get('limit') ?? undefined }));
    } catch (error) {
        return errorResponse(error, '작성 세션 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await writingSessionService.create((body ?? {}) as WritingSessionCreateInput), { status: 201 });
    } catch (error) {
        return errorResponse(error, '작성 세션을 만들지 못했습니다.');
    }
}
