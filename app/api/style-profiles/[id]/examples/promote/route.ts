import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
        const questionId = body && typeof body === 'object' && 'questionId' in body ? body.questionId : undefined;
        return NextResponse.json(await styleProfileService.promoteFinalAnswer(id, questionId));
    } catch (error) {
        if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Final answer style example promotion failed.', error);
        return NextResponse.json({ error: '최종 답변을 말투 예문으로 저장하지 못했습니다.' }, { status: 500 });
    }
}
