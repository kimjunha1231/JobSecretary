import { NextResponse } from 'next/server';
import { analyzeJobTarget, JobAnalysisError } from '@/features/job-analysis/api';
import { JobTargetServiceError } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type JobTargetAnalyzeRouteContext = {
    params: Promise<{ id: string }>;
};

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof JobTargetServiceError || error instanceof JobAnalysisError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(_request: Request, { params }: JobTargetAnalyzeRouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await analyzeJobTarget(id));
    } catch (error) {
        return errorResponse(error, '요구사항 분석을 실행하지 못했습니다.');
    }
}
