import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await styleProfileService.analyze(id));
    } catch (error) {
        if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Style profile analysis failed.', error);
        return NextResponse.json({ error: '승인 예문을 분석하지 못했습니다.' }, { status: 500 });
    }
}
