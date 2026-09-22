import { NextResponse } from 'next/server';
import { CareerProfileServiceError, careerProfileService } from '@/entities/career-profile';
import { logger } from '@/shared/lib';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof CareerProfileServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET() {
    try {
        return NextResponse.json(await careerProfileService.get(), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return errorResponse(error, '이력서 프로필을 불러오지 못했습니다.');
    }
}

export async function PUT(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: '요청 내용을 확인해 주세요.' }, { status: 400 });
    }

    try {
        return NextResponse.json(await careerProfileService.update(body), { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        return errorResponse(error, '이력서 프로필을 저장하지 못했습니다.');
    }
}
