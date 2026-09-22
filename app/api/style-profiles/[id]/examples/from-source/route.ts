import { NextResponse } from 'next/server';
import { z } from 'zod';
import { StyleProfileServiceError, styleProfileService } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
    sourceDocumentId: z.string().uuid(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: '가져올 기존 자기소개서 자료를 선택해 주세요.' }, { status: 400 });
        }
        return NextResponse.json(
            await styleProfileService.importSourceDocument(id, parsed.data.sourceDocumentId),
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof StyleProfileServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Style example source import failed.', error);
        return NextResponse.json({ error: '기존 자기소개서를 말투 예문으로 가져오지 못했습니다.' }, { status: 500 });
    }
}
