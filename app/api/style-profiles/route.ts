import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService, type StyleProfileCreateInput } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET() {
    try {
        return NextResponse.json(await styleProfileService.list());
    } catch (error) {
        return errorResponse(error, '말투 프로필을 불러오지 못했습니다.');
    }
}

export async function POST(request: Request) {
    try {
        let body: unknown;
        try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
        return NextResponse.json(await styleProfileService.create((body ?? {}) as StyleProfileCreateInput), { status: 201 });
    } catch (error) {
        return errorResponse(error, '말투 프로필을 만들지 못했습니다.');
    }
}
