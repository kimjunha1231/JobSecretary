import { NextResponse } from 'next/server';
import { EvidenceRecordServiceError, evidenceRecordService, type ManualEvidenceInput } from '@/entities/evidence-record/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown): NextResponse {
    if (error instanceof EvidenceRecordServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Failed to update manual evidence record.', error);
    return NextResponse.json({ error: '활동을 수정하지 못했습니다.' }, { status: 500 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const payload = typeof body === 'object' && body !== null && !Array.isArray(body)
            ? body as Record<string, unknown>
            : {};
        const { expectedRecordVersion, expectedCareerVersion, ...input } = payload;
        return NextResponse.json(await evidenceRecordService.updateManual(
            id,
            input as ManualEvidenceInput,
            { recordVersion: expectedRecordVersion, careerItemVersion: expectedCareerVersion },
        ));
    } catch (error) {
        return errorResponse(error);
    }
}
