import { NextRequest, NextResponse } from 'next/server';
import {
    RetrievalEvaluationAggregateSummarySchema,
    buildEvidenceRetrievalCases,
    evaluateEvidenceRetrieval,
    WritingSessionServiceError,
    writingSessionService,
} from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const querySchema = z.object({
    k: z.coerce.number().int().min(1).max(100).default(3),
    limit: z.coerce.number().int().min(1).max(20).default(5),
});

function errorResponse(error: unknown): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Aggregate retrieval evaluation failed.', error);
    return NextResponse.json({ error: '최근 검색 품질을 집계하지 못했습니다.' }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse({
            k: searchParams.get('k') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
        });
        if (!parsed.success) {
            return NextResponse.json({ error: '검색 품질 집계 조건을 확인해 주세요.' }, { status: 400 });
        }

        // The per-session service re-checks ownership and approved evidence. The
        // cap keeps this privacy-safe summary bounded when a user has many drafts.
        const sessions = await writingSessionService.list({ limit: parsed.data.limit });
        const details = await Promise.all(sessions.map(session => writingSessionService.get(session.id)));
        const caseGroups = details.map(buildEvidenceRetrievalCases);
        const cases = caseGroups.flat();
        const summary = evaluateEvidenceRetrieval(cases, { k: parsed.data.k });
        return NextResponse.json(RetrievalEvaluationAggregateSummarySchema.parse({
            ...summary,
            sessionCount: sessions.length,
            evaluatedSessionCount: caseGroups.filter(group => group.some(item => item.relevantEvidenceIds.length > 0)).length,
        }));
    } catch (error) {
        return errorResponse(error);
    }
}
