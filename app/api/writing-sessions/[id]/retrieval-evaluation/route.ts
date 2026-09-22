import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    buildEvidenceRetrievalCases,
    evaluateEvidenceRetrieval,
    listRetrievalLabels,
    WritingSessionServiceError,
    writingSessionService,
} from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const requestSchema = z.object({
    k: z.number().int().min(1).max(100).default(3),
});

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown = {};
        const rawBody = await request.text();
        if (rawBody.trim()) {
            try {
                body = JSON.parse(rawBody);
            } catch {
                return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
            }
        }
        const parsed = requestSchema.safeParse(body && typeof body === 'object' ? body : {});
        if (!parsed.success) {
            throw new WritingSessionServiceError('invalid_input', '검색 평가 조건을 확인해 주세요.', 400);
        }

        const details = await writingSessionService.get(id);
        const labels = await listRetrievalLabels(id);
        const cases = buildEvidenceRetrievalCases(details, labels);
        return NextResponse.json(evaluateEvidenceRetrieval(cases, { k: parsed.data.k }));
    } catch (error) {
        return errorResponse(error, '검색 품질을 측정하지 못했습니다.');
    }
}
