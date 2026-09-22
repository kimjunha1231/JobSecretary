import { NextResponse } from 'next/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await evidenceRecordService.updateStatus(id, body));
    } catch (error) {
        if (error instanceof EvidenceRecordServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Failed to update evidence activity status.', error);
        return NextResponse.json({ error: '활동 상태를 변경하지 못했습니다.' }, { status: 500 });
    }
}
