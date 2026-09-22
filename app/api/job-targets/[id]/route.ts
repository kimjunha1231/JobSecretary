import { NextResponse } from 'next/server';
import { JobTargetServiceError, jobTargetService } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type JobTargetRouteContext = {
    params: Promise<{ id: string }>;
};

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: JobTargetRouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await jobTargetService.get(id));
    } catch (error) {
        return errorResponse(error, '지원 대상 정보를 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request, { params }: JobTargetRouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await jobTargetService.update(id, (body ?? {}) as Record<string, unknown>));
    } catch (error) {
        return errorResponse(error, '지원 대상 정보를 저장하지 못했습니다.');
    }
}
