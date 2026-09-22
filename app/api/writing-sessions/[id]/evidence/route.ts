import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService, type EvidenceSelectionInput } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

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
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        if (body && typeof body === 'object' && 'refresh' in body && body.refresh === true) {
            return NextResponse.json(await writingSessionService.refreshMatches(id));
        }
        return NextResponse.json(await writingSessionService.updateEvidenceSelections(id, (body ?? {}) as EvidenceSelectionInput));
    } catch (error) {
        return errorResponse(error, '활동 근거 선택을 저장하지 못했습니다.');
    }
}
