import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(_request: Request, { params }: RouteContext) {
    try {
        const { id, questionId } = await params;
        return NextResponse.json(await writingSessionService.switchQuestion(id, questionId));
    } catch (error) {
        if (error instanceof WritingSessionServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Writing session question switch failed.', error);
        return NextResponse.json({ error: '문항을 전환하지 못했습니다.' }, { status: 500 });
    }
}
