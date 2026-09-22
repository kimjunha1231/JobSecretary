import { NextResponse } from 'next/server';
import { StyleEvaluationServiceError, styleEvaluationService } from '@/entities/style-evaluation';
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
        return NextResponse.json({ cases: await styleEvaluationService.listCases(id) });
    } catch (error) {
        return errorResponse(error, '평가 사례를 불러오지 못했습니다.');
    }
}

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await styleEvaluationService.createCase(id), { status: 201 });
    } catch (error) {
        return errorResponse(error, '평가 사례를 저장하지 못했습니다.');
    }
}
