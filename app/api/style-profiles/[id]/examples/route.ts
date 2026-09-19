import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService, type StyleExampleInput } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
        return NextResponse.json(await styleProfileService.addExample(id, (body ?? {}) as StyleExampleInput), { status: 201 });
    } catch (error) {
        if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Style example creation failed.', error);
        return NextResponse.json({ error: '말투 예문을 추가하지 못했습니다.' }, { status: 500 });
    }
}
