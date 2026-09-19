import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService, type StyleProfileUpdateInput } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await styleProfileService.get(id));
    } catch (error) {
        return errorResponse(error, '말투 프로필을 불러오지 못했습니다.');
    }
}

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
        return NextResponse.json(await styleProfileService.update(id, (body ?? {}) as StyleProfileUpdateInput));
    } catch (error) {
        return errorResponse(error, '말투 프로필을 저장하지 못했습니다.');
    }
}
