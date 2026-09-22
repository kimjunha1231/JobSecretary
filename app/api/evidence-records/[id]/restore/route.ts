import { NextResponse } from 'next/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';
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
        const revisionId = typeof body === 'object' && body !== null && 'revisionId' in body
            ? (body as { revisionId?: unknown }).revisionId
            : undefined;
        return NextResponse.json(await evidenceRecordService.restoreRevision(id, revisionId));
    } catch (error) {
        if (error instanceof EvidenceRecordServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Failed to restore evidence activity revision.', error);
        return NextResponse.json({ error: '이전 활동 버전을 복원하지 못했습니다.' }, { status: 500 });
    }
}
