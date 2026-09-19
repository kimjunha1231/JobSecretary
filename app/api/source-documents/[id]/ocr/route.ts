import { NextResponse } from 'next/server';
import { SourceDocumentServiceError } from '@/entities/source-document/api';
import { runSourceOcr, SourceOcrError } from '@/features/source-ocr/api';
import { AiAccessError } from '@/shared/lib/ai-access';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        return NextResponse.json(await runSourceOcr(id));
    } catch (error) {
        if (error instanceof AiAccessError) {
            const headers = error.retryAfterSeconds
                ? { 'Retry-After': String(error.retryAfterSeconds) }
                : undefined;
            return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 429, headers });
        }
        if (error instanceof SourceOcrError || error instanceof SourceDocumentServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        logger.error('Source PDF OCR route failed.', error);
        return NextResponse.json({ error: 'PDF OCR에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
    }
}
