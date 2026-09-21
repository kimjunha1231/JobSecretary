import { NextRequest, NextResponse } from 'next/server';
import { MAX_SOURCE_BYTES } from '@/features/source-ingestion/api';
import { SourceDocumentServiceError, sourceDocumentService } from '@/entities/source-document/api';
import { AiAccessError, requireUserRateLimit } from '@/shared/lib/ai-access';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof AiAccessError) {
        return NextResponse.json({ error: error.message }, {
            status: error.code === 'RATE_LIMITED' ? 429 : 401,
            headers: error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined,
        });
    }
    if (error instanceof SourceDocumentServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

function getFormString(formData: FormData, key: string): string | undefined {
    const value = formData.get(key);
    return typeof value === 'string' ? value : undefined;
}

function toSafeTitle(filename?: string): string {
    const cleanName = filename?.split(/[\\/]/).pop()?.trim() ?? '';
    const withoutExtension = cleanName.replace(/\.[^/.]+$/, '').trim();
    return withoutExtension.slice(0, 200) || '새 경력 자료';
}

function toUrlTitle(sourceUrl?: unknown): string {
    if (typeof sourceUrl !== 'string') return '연결한 채용 자료';
    try {
        return `${new URL(sourceUrl).hostname} 자료`.slice(0, 200);
    } catch {
        return '연결한 채용 자료';
    }
}

function toSummary(document: Awaited<ReturnType<typeof sourceDocumentService.register>>['document']) {
    return { ...document, rawText: undefined };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const data = await sourceDocumentService.list({
            limit: searchParams.get('limit') ?? undefined,
            status: searchParams.get('status') ?? undefined,
        });
        return NextResponse.json(data.map(toSummary));
    } catch (error) {
        return errorResponse(error, '자료 목록을 불러오지 못했습니다.');
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireUserRateLimit('source_ingestion', '자료 등록 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');

        const contentLength = Number(request.headers.get('content-length') ?? 0);
        // Multipart overhead is small relative to the file cap; the parser checks the exact byte size again.
        if (contentLength > MAX_SOURCE_BYTES + 1024 * 1024) {
            return NextResponse.json(
                { error: `자료는 ${Math.floor(MAX_SOURCE_BYTES / (1024 * 1024))}MB 이하만 가져올 수 있습니다.` },
                { status: 413 },
            );
        }

        const contentType = request.headers.get('content-type') ?? '';
        let registrationInput;

        if (contentType.includes('multipart/form-data')) {
            let formData: FormData;
            try {
                formData = await request.formData();
            } catch {
                return NextResponse.json({ error: '파일 업로드 형식을 읽지 못했습니다.' }, { status: 400 });
            }

            const file = formData.get('file');
            const text = getFormString(formData, 'text');
            const isFileLike = typeof file === 'object' && file !== null && 'arrayBuffer' in file;
            const fileSize = isFileLike && 'size' in file && typeof file.size === 'number' ? file.size : 0;
            if (fileSize > MAX_SOURCE_BYTES) {
                return NextResponse.json(
                    { error: `자료는 ${Math.floor(MAX_SOURCE_BYTES / (1024 * 1024))}MB 이하만 가져올 수 있습니다.` },
                    { status: 413 },
                );
            }

            if (isFileLike) {
                const upload = file as File;
                registrationInput = {
                    kind: getFormString(formData, 'kind'),
                    title: getFormString(formData, 'title') || toSafeTitle(upload.name),
                    originType: getFormString(formData, 'originType') || 'upload',
                    buffer: new Uint8Array(await upload.arrayBuffer()),
                    filename: upload.name,
                    mimeType: upload.type,
                };
            } else {
                registrationInput = {
                    kind: getFormString(formData, 'kind'),
                    title: getFormString(formData, 'title') || '붙여넣은 경력 자료',
                    originType: getFormString(formData, 'originType') || 'pasted_text',
                    text,
                    mimeType: 'text/plain',
                };
            }
        } else {
            let body: unknown;
            try {
                body = await request.json();
            } catch {
                return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
            }

            if (!body || typeof body !== 'object') {
                return NextResponse.json({ error: '자료 입력을 확인해 주세요.' }, { status: 400 });
            }

            const payload = body as Record<string, unknown>;
            const sourceUrl = payload.sourceUrl;
            registrationInput = {
                kind: payload.kind,
                title: payload.title || (sourceUrl ? toUrlTitle(sourceUrl) : '붙여넣은 경력 자료'),
                originType: payload.originType || (sourceUrl ? 'url' : 'pasted_text'),
                sourceUrl,
                text: payload.text,
                mimeType: payload.mimeType || 'text/plain',
            };
        }

        const result = await sourceDocumentService.register(registrationInput);
        return NextResponse.json({
            document: toSummary(result.document),
            fragmentCount: result.fragments.length,
            warnings: result.warnings,
        }, { status: 201 });
    } catch (error) {
        return errorResponse(error, '자료를 등록하지 못했습니다.');
    }
}
