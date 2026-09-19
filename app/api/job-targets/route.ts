import { NextRequest, NextResponse } from 'next/server';
import { JobTargetServiceError, jobTargetService, type JobTargetRegistrationInput } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targets = await jobTargetService.list({ limit: searchParams.get('limit') ?? undefined });
        return NextResponse.json(targets);
    } catch (error) {
        return errorResponse(error, '지원 대상 목록을 불러오지 못했습니다.');
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
        const result = await jobTargetService.create((body ?? {}) as JobTargetRegistrationInput);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return errorResponse(error, '지원 대상을 만들지 못했습니다.');
    }
}
