import { NextResponse } from 'next/server';
import { StyleEvaluationServiceError, styleEvaluationService, type StyleEvaluationRunInput } from '@/entities/style-evaluation';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof StyleEvaluationServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json({ runs: await styleEvaluationService.listRuns(id) });
    } catch (error) {
        return errorResponse(error, '평가 결과를 불러오지 못했습니다.');
    }
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await styleEvaluationService.run(id, (body ?? {}) as StyleEvaluationRunInput), { status: 201 });
    } catch (error) {
        return errorResponse(error, '평가를 실행하지 못했습니다.');
    }
}
