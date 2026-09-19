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

async function parseBody(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        throw new StyleEvaluationServiceError('invalid_input', 'Invalid JSON body', 400);
    }
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await styleEvaluationService.startBlindComparison(id, await parseBody(request)), { status: 201 });
    } catch (error) {
        return errorResponse(error, 'blind 비교를 시작하지 못했습니다.');
    }
}

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await styleEvaluationService.submitBlindPreference(id, await parseBody(request)));
    } catch (error) {
        return errorResponse(error, 'blind 비교 선택을 저장하지 못했습니다.');
    }
}
