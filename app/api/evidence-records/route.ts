import { NextRequest, NextResponse } from 'next/server';
import { EvidenceRecordServiceError, evidenceRecordService, type ManualEvidenceInput } from '@/entities/evidence-record/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof EvidenceRecordServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        return NextResponse.json(await evidenceRecordService.listApproved({ limit: searchParams.get('limit') ?? undefined }));
    } catch (error) {
        return errorResponse(error, '승인된 활동 근거를 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        return NextResponse.json(await evidenceRecordService.createManual((body ?? {}) as ManualEvidenceInput), { status: 201 });
    } catch (error) {
        return errorResponse(error, '활동 근거를 저장하지 못했습니다.');
    }
}
