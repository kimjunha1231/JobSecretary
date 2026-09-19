import { NextResponse } from 'next/server';
import { StyleEvaluationServiceError, styleEvaluationService } from '@/entities/style-evaluation';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        return NextResponse.json(await styleEvaluationService.getPreferenceSummary());
    } catch (error) {
        if (error instanceof StyleEvaluationServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Style preference summary failed.', error);
        return NextResponse.json({ error: '말투 선호 요약을 불러오지 못했습니다.' }, { status: 500 });
    }
}
