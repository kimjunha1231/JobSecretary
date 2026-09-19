import { NextResponse } from 'next/server';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const paragraphs = body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).paragraphs)
            ? (body as { paragraphs: Array<{ position: number; sourceDraftId: string; text: string }> }).paragraphs
            : [];
        return NextResponse.json(await writingSessionService.mergeDrafts(id, paragraphs));
    } catch (error) {
        if (error instanceof WritingSessionServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Writing session draft merge failed.', error);
        return NextResponse.json({ error: '문단을 병합하지 못했습니다.' }, { status: 500 });
    }
}
