import { NextResponse } from 'next/server';
import {
    listRetrievalLabels,
    replaceRetrievalLabels,
    WritingSessionServiceError,
} from '@/entities/writing-session/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof WritingSessionServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json({ labels: await listRetrievalLabels(id) });
    } catch (error) {
        return errorResponse(error, '검색 정답 라벨을 불러오지 못했습니다.');
    }
}

export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown = {};
        const rawBody = await request.text();
        if (rawBody.trim()) {
            try {
                body = JSON.parse(rawBody);
            } catch {
                return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
            }
        }
        return NextResponse.json({ labels: await replaceRetrievalLabels(id, body) });
    } catch (error) {
        return errorResponse(error, '검색 정답 라벨을 저장하지 못했습니다.');
    }
}
