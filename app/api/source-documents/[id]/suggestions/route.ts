import { NextResponse } from 'next/server';
import { CareerExtractionError, generateCareerCandidates } from '@/features/career-extraction';
import { SourceDocumentServiceError } from '@/entities/source-document/api';
import { AiAccessError } from '@/shared/lib/ai-access';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown): NextResponse {
    if (error instanceof CareerExtractionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SourceDocumentServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AiAccessError) {
        return NextResponse.json({ error: error.message }, {
            status: error.code === 'RATE_LIMITED' ? 429 : 401,
            headers: error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined,
        });
    }
    logger.error('Career candidate suggestion failed.', error);
    return NextResponse.json({ error: '활동 후보를 만들지 못했습니다.' }, { status: 500 });
}

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await generateCareerCandidates(id));
    } catch (error) {
        return errorResponse(error);
    }
}
