import { createServerSupabaseClient } from '@/shared/api/server';
import {
    SourceDocumentKindSchema,
    SourceDocumentOriginSchema,
    SourceDocumentSchema,
    SourceDocumentStatusSchema,
    SourceFragmentSchema,
    type SourceDocument,
    type SourceDocumentKind,
    type SourceDocumentOrigin,
    type SourceDocumentStatus,
    type SourceFragment,
} from '@/entities/source-document/model';
import { DomainIdSchema } from '@/shared/types';
import {
    extractSourceFile,
    extractHtmlSource,
    extractTextSource,
    fetchSourceUrl,
    SourceExtractionError,
    SourceUrlFetchError,
    type SourceExtractionResult,
} from '@/features/source-ingestion/api';
import { logger } from '@/shared/lib';
import { z } from 'zod';

const sourceDocumentRegistrationSchema = z.object({
    kind: SourceDocumentKindSchema,
    title: z.string().trim().min(1).max(200),
    originType: SourceDocumentOriginSchema,
    sourceUrl: z.string().trim().min(1).max(2_048).optional(),
});

const sourceDocumentListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    status: SourceDocumentStatusSchema.optional(),
});

const sourceDocumentIdSchema = DomainIdSchema;
const sourceDocumentStatusUpdateSchema = z.object({
    status: z.enum(['needs_review', 'approved', 'archived', 'manual_input']),
});
const manualTextUpdateSchema = z.object({
    text: z.string().trim().min(1, '보정할 텍스트를 입력해 주세요.').max(500_000, '텍스트는 500,000자 이하만 저장할 수 있습니다.'),
});

export type SourceDocumentRegistrationInput = {
    kind: unknown;
    title: unknown;
    originType: unknown;
    sourceUrl?: unknown;
    text?: unknown;
    buffer?: Uint8Array;
    filename?: unknown;
    mimeType?: unknown;
};

export type ManualTextUpdateInput = z.input<typeof manualTextUpdateSchema>;

export type RegisteredSourceDocument = {
    document: SourceDocument;
    fragments: SourceFragment[];
    warnings: string[];
};

const DEFAULT_SOURCE_STORAGE_BUCKET = 'source-documents';
type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type SourceStorageApi = ReturnType<ServerSupabaseClient['storage']['from']>;
type OriginalSource = {
    bytes: Uint8Array;
    filename?: string;
    mimeType: string;
};
type ExtractedInput = {
    extraction: SourceExtractionResult;
    original: OriginalSource;
};

export class SourceDocumentServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'extraction' | 'fetch' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 413 | 422 | 500 | 502 | 504 = 500,
    ) {
        super(message);
        this.name = 'SourceDocumentServiceError';
    }
}

function nullableString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function nullableNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function mapSourceDocumentRecord(record: Record<string, unknown>): SourceDocument {
    return SourceDocumentSchema.parse({
        id: record.id,
        userId: record.user_id,
        kind: record.kind,
        title: record.title,
        originType: record.origin_type,
        sourceUrl: nullableString(record.source_url),
        storagePath: nullableString(record.storage_path),
        rawText: nullableString(record.raw_text),
        contentHash: nullableString(record.content_hash),
        mimeType: nullableString(record.mime_type),
        pageCount: nullableNumber(record.page_count),
        status: record.status,
        extractionMethod: record.extraction_method,
        extractionVersion: nullableString(record.extraction_version),
        extractionWarnings: Array.isArray(record.extraction_warnings)
            ? record.extraction_warnings.filter((value): value is string => typeof value === 'string').slice(0, 20)
            : [],
        fetchedAt: nullableString(record.fetched_at),
        approvedAt: nullableString(record.approved_at),
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapSourceFragmentRecord(record: Record<string, unknown>): SourceFragment {
    return SourceFragmentSchema.parse({
        id: record.id,
        sourceDocumentId: record.source_document_id,
        userId: record.user_id,
        locator: record.locator ?? {},
        content: record.content,
        createdAt: record.created_at,
    });
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) {
        throw new SourceDocumentServiceError('unauthorized', 'Unauthorized', 401);
    }
    return user.id;
}

function mapExtractionError(error: SourceExtractionError): SourceDocumentServiceError {
    return new SourceDocumentServiceError('extraction', error.message, error.status);
}

function mapSourceUrlError(error: SourceUrlFetchError): SourceDocumentServiceError {
    return new SourceDocumentServiceError('fetch', error.message, error.status);
}

function mapRegistrationInput(input: SourceDocumentRegistrationInput): {
    kind: SourceDocumentKind;
    title: string;
    originType: SourceDocumentOrigin;
    sourceUrl?: string;
} {
    const parsed = sourceDocumentRegistrationSchema.safeParse({
        kind: input.kind,
        title: input.title,
        originType: input.originType,
        sourceUrl: input.sourceUrl,
    });

    if (!parsed.success) {
        throw new SourceDocumentServiceError('invalid_input', '자료 종류, 제목, 등록 방식을 확인해 주세요.', 400);
    }

    return parsed.data;
}

async function extractInput(input: SourceDocumentRegistrationInput, metadata: {
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
    sourceUrl?: string;
}): Promise<ExtractedInput> {
    try {
        if (metadata.originType === 'url') {
            if (!metadata.sourceUrl) {
                throw new SourceExtractionError('empty_input', '가져올 URL을 입력해 주세요.');
            }
            const fetched = await fetchSourceUrl(metadata.sourceUrl);
            const extraction = fetched.contentType === 'text/plain'
                ? extractTextSource({
                    text: fetched.body,
                    kind: metadata.kind,
                    originType: 'url',
                    mimeType: fetched.contentType,
                })
                : extractHtmlSource({
                    html: fetched.body,
                    kind: metadata.kind,
                    originType: 'url',
                    mimeType: fetched.contentType,
                });
            return {
                extraction: {
                    ...extraction,
                    sourceUrl: fetched.finalUrl,
                    fetchedAt: new Date().toISOString(),
                },
                original: {
                    bytes: Buffer.from(fetched.body, 'utf8'),
                    filename: `${metadata.kind}.${fetched.contentType === 'text/plain' ? 'txt' : 'html'}`,
                    mimeType: fetched.contentType,
                },
            };
        }

        if (typeof input.text === 'string') {
            const extraction = extractTextSource({
                text: input.text,
                kind: metadata.kind,
                originType: metadata.originType,
                mimeType: typeof input.mimeType === 'string' ? input.mimeType : 'text/plain',
            });
            return {
                extraction,
                original: {
                    bytes: Buffer.from(input.text, 'utf8'),
                    filename: 'pasted',
                    mimeType: extraction.mimeType,
                },
            };
        }

        if (input.buffer && input.buffer.byteLength > 0) {
            const filename = typeof input.filename === 'string' ? input.filename : undefined;
            const extraction = await extractSourceFile({
                buffer: input.buffer,
                filename,
                mimeType: typeof input.mimeType === 'string' ? input.mimeType : undefined,
                kind: metadata.kind,
                originType: metadata.originType,
            });
            return {
                extraction,
                original: {
                    bytes: input.buffer,
                    filename,
                    mimeType: extraction.mimeType,
                },
            };
        }

        throw new SourceExtractionError('empty_input', '파일 또는 붙여넣은 텍스트가 필요합니다.');
    } catch (error) {
        if (error instanceof SourceExtractionError) {
            throw mapExtractionError(error);
        }
        if (error instanceof SourceUrlFetchError) throw mapSourceUrlError(error);
        throw error;
    }
}

function getSourceStorageBucket(): string {
    return process.env.SUPABASE_SOURCE_STORAGE_BUCKET?.trim() || DEFAULT_SOURCE_STORAGE_BUCKET;
}

function getSourceStorageApi(supabase: ServerSupabaseClient): SourceStorageApi | null {
    const storage = (supabase as ServerSupabaseClient & { storage?: ServerSupabaseClient['storage'] }).storage;
    return storage && typeof storage.from === 'function' ? storage.from(getSourceStorageBucket()) : null;
}

function getStorageExtension(filename: string | undefined, mimeType: string): string {
    const filenameExtension = filename?.split(/[\\/]/).pop()?.match(/(\.[a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
    const allowedExtensions = new Set(['.pdf', '.docx', '.txt', '.text', '.md', '.markdown', '.csv', '.json', '.html']);
    if (filenameExtension && allowedExtensions.has(filenameExtension)) return filenameExtension;

    const extensionByMime: Record<string, string> = {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/markdown': '.md',
        'text/plain': '.txt',
        'text/csv': '.csv',
        'application/json': '.json',
        'text/html': '.html',
        'application/xhtml+xml': '.html',
    };
    return extensionByMime[mimeType] ?? '.bin';
}

async function cleanupSourceDocument(
    supabase: ServerSupabaseClient,
    userId: string,
    documentId: string,
    storagePath?: string,
): Promise<void> {
    if (storagePath) {
        const storage = getSourceStorageApi(supabase);
        if (storage) {
            const { error } = await storage.remove([storagePath]);
            if (error) logger.error('Failed to clean up source document object:', error);
        }
    }

    const { error } = await supabase
        .from('source_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);
    if (error) logger.error('Failed to clean up incomplete source document:', error);
}

const SOURCE_DOCUMENT_LIST_COLUMNS = [
    'id',
    'user_id',
    'kind',
    'title',
    'origin_type',
    'source_url',
    'storage_path',
    'content_hash',
    'mime_type',
    'page_count',
    'status',
    'extraction_method',
    'extraction_version',
    'extraction_warnings',
    'fetched_at',
    'approved_at',
    'created_at',
    'updated_at',
].join(',');

export const sourceDocumentService = {
    async list(options: { limit?: unknown; status?: unknown } = {}): Promise<SourceDocument[]> {
        const parsedOptions = sourceDocumentListSchema.safeParse(options);
        if (!parsedOptions.success) {
            throw new SourceDocumentServiceError('invalid_input', '목록 조건을 확인해 주세요.', 400);
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);

        let query = supabase
            .from('source_documents')
            .select(SOURCE_DOCUMENT_LIST_COLUMNS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parsedOptions.data.limit);

        if (parsedOptions.data.status) {
            query = query.eq('status', parsedOptions.data.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data ?? []).map(record => mapSourceDocumentRecord(record as unknown as Record<string, unknown>));
    },

    async get(id: unknown): Promise<{ document: SourceDocument; fragments: SourceFragment[] } | null> {
        const parsedId = sourceDocumentIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new SourceDocumentServiceError('invalid_input', '자료 ID를 확인해 주세요.', 400);
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);

        const { data, error } = await supabase
            .from('source_documents')
            .select('*')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;

        const { data: fragmentData, error: fragmentError } = await supabase
            .from('source_fragments')
            .select('*')
            .eq('source_document_id', parsedId.data)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
        if (fragmentError) throw fragmentError;

        return {
            document: mapSourceDocumentRecord(data as Record<string, unknown>),
            fragments: (fragmentData ?? []).map(record => mapSourceFragmentRecord(record as Record<string, unknown>)),
        };
    },

    async createOriginalDownloadUrl(id: unknown): Promise<string> {
        const parsedId = sourceDocumentIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new SourceDocumentServiceError('invalid_input', '자료 ID를 확인해 주세요.', 400);
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);
        const { data, error } = await supabase
            .from('source_documents')
            .select('storage_path')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw error;
        const storagePath = nullableString((data as Record<string, unknown> | null)?.storage_path);
        if (!storagePath) {
            throw new SourceDocumentServiceError('not_found', '보관된 원본 파일이 없습니다.', 404);
        }

        const storage = getSourceStorageApi(supabase);
        if (!storage) {
            throw new SourceDocumentServiceError('storage', '원본 파일 저장소가 설정되지 않았습니다.', 500);
        }
        const { data: signed, error: signedUrlError } = await storage.createSignedUrl(storagePath, 300);
        if (signedUrlError || !signed?.signedUrl) {
            throw new SourceDocumentServiceError('storage', '원본 파일 링크를 만들지 못했습니다.', 500);
        }
        return signed.signedUrl;
    },

    async register(input: SourceDocumentRegistrationInput): Promise<RegisteredSourceDocument> {
        const metadata = mapRegistrationInput(input);
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);
        const { extraction, original } = await extractInput(input, metadata);

        const record = {
            user_id: userId,
            kind: metadata.kind,
            title: metadata.title,
            origin_type: metadata.originType,
            ...(extraction.sourceUrl ? { source_url: extraction.sourceUrl } : {}),
            ...(extraction.rawText ? { raw_text: extraction.rawText } : {}),
            content_hash: extraction.contentHash,
            mime_type: extraction.mimeType,
            ...(extraction.pageCount ? { page_count: extraction.pageCount } : {}),
            status: extraction.status,
            extraction_method: extraction.extractionMethod,
            extraction_version: extraction.extractionVersion,
            extraction_warnings: extraction.warnings,
            ...(extraction.fetchedAt ? { fetched_at: extraction.fetchedAt } : {}),
        };

        const { data, error } = await supabase
            .from('source_documents')
            .insert(record)
            .select('*')
            .single();
        if (error) throw error;

        let document = mapSourceDocumentRecord(data as Record<string, unknown>);
        let fragments: SourceFragment[] = [];
        let storagePath: string | undefined;

        try {
            if (extraction.fragments.length > 0) {
                const fragmentRecords = extraction.fragments.map(fragment => ({
                    source_document_id: document.id,
                    user_id: userId,
                    locator: fragment.locator,
                    content: fragment.content,
                }));

                const { data: insertedFragments, error: fragmentError } = await supabase
                    .from('source_fragments')
                    .insert(fragmentRecords)
                    .select('*');

                if (fragmentError) throw fragmentError;
                fragments = (insertedFragments ?? []).map(record => mapSourceFragmentRecord(record as Record<string, unknown>));
            }

            const storage = getSourceStorageApi(supabase);
            if (storage) {
                storagePath = `${userId}/${document.id}/original${getStorageExtension(original.filename, original.mimeType)}`;
                const { error: uploadError } = await storage.upload(storagePath, Buffer.from(original.bytes), {
                    contentType: original.mimeType,
                    upsert: false,
                });
                if (uploadError) {
                    throw new SourceDocumentServiceError('storage', '원본 자료를 안전하게 보관하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
                }

                const { data: storedRecord, error: storagePathError } = await supabase
                    .from('source_documents')
                    .update({ storage_path: storagePath, updated_at: new Date().toISOString() })
                    .eq('id', document.id)
                    .eq('user_id', userId)
                    .select('*')
                    .single();
                if (storagePathError || !storedRecord) {
                    throw new SourceDocumentServiceError('storage', '원본 자료 경로를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
                }
                document = mapSourceDocumentRecord(storedRecord as Record<string, unknown>);
            }
        } catch (error) {
            await cleanupSourceDocument(supabase, userId, document.id, storagePath);
            throw error;
        }

        return { document, fragments, warnings: extraction.warnings };
    },

    async updateStatus(id: unknown, input: unknown): Promise<SourceDocument> {
        const parsedId = sourceDocumentIdSchema.safeParse(id);
        const parsedInput = sourceDocumentStatusUpdateSchema.safeParse(input);
        if (!parsedId.success || !parsedInput.success) {
            throw new SourceDocumentServiceError('invalid_input', '검수 상태를 확인해 주세요.', 400);
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);
        const status = parsedInput.data.status;

        const { data, error } = await supabase
            .from('source_documents')
            .update({
                status,
                approved_at: status === 'approved' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .select('*')
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            throw new SourceDocumentServiceError('not_found', '자료를 찾을 수 없습니다.', 404);
        }

        return mapSourceDocumentRecord(data as Record<string, unknown>);
    },

    async updateManualText(id: unknown, input: ManualTextUpdateInput): Promise<SourceDocument> {
        const parsedId = sourceDocumentIdSchema.safeParse(id);
        const parsedInput = manualTextUpdateSchema.safeParse(input);
        if (!parsedId.success || !parsedInput.success) {
            throw new SourceDocumentServiceError('invalid_input', parsedInput.success ? '자료 ID를 확인해 주세요.' : parsedInput.error.issues[0]?.message ?? '보정할 텍스트를 확인해 주세요.', 400);
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);
        const { data: existing, error: existingError } = await supabase
            .from('source_documents')
            .select('kind')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) throw new SourceDocumentServiceError('not_found', '자료를 찾을 수 없습니다.', 404);

        const extraction = extractTextSource({
            text: parsedInput.data.text,
            kind: existing.kind,
            originType: 'pasted_text',
            mimeType: 'text/plain',
        });
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('source_documents')
            .update({
                raw_text: extraction.rawText ?? parsedInput.data.text,
                content_hash: extraction.contentHash,
                mime_type: extraction.mimeType,
                status: 'needs_review',
                extraction_method: 'manual',
                extraction_version: extraction.extractionVersion,
                extraction_warnings: extraction.warnings,
                approved_at: null,
                updated_at: now,
            })
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .select('*')
            .single();
        if (error) throw error;

        const { error: deleteFragmentsError } = await supabase
            .from('source_fragments')
            .delete()
            .eq('source_document_id', parsedId.data)
            .eq('user_id', userId);
        if (deleteFragmentsError) throw deleteFragmentsError;

        if (extraction.fragments.length > 0) {
            const { error: fragmentError } = await supabase
                .from('source_fragments')
                .insert(extraction.fragments.map(fragment => ({
                    source_document_id: parsedId.data,
                    user_id: userId,
                    locator: fragment.locator,
                    content: fragment.content,
                })));
            if (fragmentError) throw fragmentError;
        }

        return mapSourceDocumentRecord(data as Record<string, unknown>);
    },
};
