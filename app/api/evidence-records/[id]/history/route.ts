import { NextResponse } from 'next/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await evidenceRecordService.getHistory(id));
    } catch (error) {
        if (error instanceof EvidenceRecordServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Failed to load evidence activity history.', error);
        return NextResponse.json({ error: '활동 버전을 불러오지 못했습니다.' }, { status: 500 });
    }
}
