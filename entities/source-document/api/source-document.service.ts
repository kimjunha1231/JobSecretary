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
    extractTextSource,
    SourceExtractionError,
    type SourceExtractionResult,
} from '@/features/source-ingestion/api';
import { logger } from '@/shared/lib';
import { z } from 'zod';

const sourceDocumentRegistrationSchema = z.object({
    kind: SourceDocumentKindSchema,
    title: z.string().trim().min(1).max(200),
    originType: SourceDocumentOriginSchema,
});

const sourceDocumentListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    status: SourceDocumentStatusSchema.optional(),
});

const sourceDocumentIdSchema = DomainIdSchema;
const sourceDocumentStatusUpdateSchema = z.object({
    status: z.enum(['needs_review', 'approved', 'archived', 'manual_input']),
});

export type SourceDocumentRegistrationInput = {
    kind: unknown;
    title: unknown;
    originType: unknown;
    text?: unknown;
    buffer?: Uint8Array;
    filename?: unknown;
    mimeType?: unknown;
};

export type RegisteredSourceDocument = {
    document: SourceDocument;
    fragments: SourceFragment[];
    warnings: string[];
};

export class SourceDocumentServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'extraction' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 413 | 422 | 500 = 500,
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

function mapRegistrationInput(input: SourceDocumentRegistrationInput): {
    kind: SourceDocumentKind;
    title: string;
    originType: SourceDocumentOrigin;
} {
    const parsed = sourceDocumentRegistrationSchema.safeParse({
        kind: input.kind,
        title: input.title,
        originType: input.originType,
    });

    if (!parsed.success) {
        throw new SourceDocumentServiceError('invalid_input', '자료 종류, 제목, 등록 방식을 확인해 주세요.', 400);
    }

    return parsed.data;
}

async function extractInput(input: SourceDocumentRegistrationInput, metadata: {
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
}): Promise<SourceExtractionResult> {
    try {
        if (typeof input.text === 'string') {
            return extractTextSource({
                text: input.text,
                kind: metadata.kind,
                originType: metadata.originType,
                mimeType: typeof input.mimeType === 'string' ? input.mimeType : 'text/plain',
            });
        }

        if (input.buffer && input.buffer.byteLength > 0) {
            return extractSourceFile({
                buffer: input.buffer,
                filename: typeof input.filename === 'string' ? input.filename : undefined,
                mimeType: typeof input.mimeType === 'string' ? input.mimeType : undefined,
                kind: metadata.kind,
                originType: metadata.originType,
            });
        }

        throw new SourceExtractionError('empty_input', '파일 또는 붙여넣은 텍스트가 필요합니다.');
    } catch (error) {
        if (error instanceof SourceExtractionError) {
            throw mapExtractionError(error);
        }
        throw error;
    }
}

const SOURCE_DOCUMENT_LIST_COLUMNS = [
    'id',
    'user_id',
    'kind',
    'title',
    'origin_type',
    'source_url',
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

    async register(input: SourceDocumentRegistrationInput): Promise<RegisteredSourceDocument> {
        const metadata = mapRegistrationInput(input);
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = getUserIdOrThrow(user);
        const extraction = await extractInput(input, metadata);

        const record = {
            user_id: userId,
            kind: metadata.kind,
            title: metadata.title,
            origin_type: metadata.originType,
            ...(extraction.rawText ? { raw_text: extraction.rawText } : {}),
            content_hash: extraction.contentHash,
            mime_type: extraction.mimeType,
            ...(extraction.pageCount ? { page_count: extraction.pageCount } : {}),
            status: extraction.status,
            extraction_method: extraction.extractionMethod,
            extraction_version: extraction.extractionVersion,
            extraction_warnings: extraction.warnings,
        };

        const { data, error } = await supabase
            .from('source_documents')
            .insert(record)
            .select('*')
            .single();
        if (error) throw error;

        const document = mapSourceDocumentRecord(data as Record<string, unknown>);
        let fragments: SourceFragment[] = [];

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

            if (fragmentError) {
                const { error: cleanupError } = await supabase
                    .from('source_documents')
                    .delete()
                    .eq('id', document.id)
                    .eq('user_id', userId);
                if (cleanupError) logger.error('Failed to clean up incomplete source document:', cleanupError);
                throw fragmentError;
            }

            fragments = (insertedFragments ?? []).map(record => mapSourceFragmentRecord(record as Record<string, unknown>));
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
};
