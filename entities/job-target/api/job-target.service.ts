import { createServerSupabaseClient } from '@/shared/api/server';
import {
    JobRequirementCategorySchema,
    JobRequirementSchema,
    JobRequirementStatusSchema,
    JobTargetSchema,
    JobTargetSourceRoleSchema,
    type JobRequirement,
    type JobRequirementCategory,
    type JobTarget,
    type JobTargetSourceRole,
} from '@/entities/job-target/model';
import {
    SourceDocumentSchema,
    type SourceDocument,
} from '@/entities/source-document/model';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';

const jobTargetStatusSchema = z.enum(['draft', 'collecting_sources', 'analyzed', 'reviewed', 'active', 'closed']);

const sourceLinkSchema = z.object({
    sourceDocumentId: DomainIdSchema,
    sourceRole: JobTargetSourceRoleSchema,
    isPrimary: z.boolean().default(false),
});

const jobTargetCreateSchema = z.object({
    company: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    employmentType: z.string().trim().max(100).optional(),
    seniority: z.string().trim().max(100).optional(),
    deadline: z.string().trim().max(100).optional(),
    sourceLinks: z.array(sourceLinkSchema).max(20).optional(),
});

const jobTargetUpdateSchema = jobTargetCreateSchema.partial().extend({
    status: jobTargetStatusSchema.optional(),
});

const jobTargetListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
});

const requirementStatusUpdateSchema = z.object({
    status: JobRequirementStatusSchema,
});

const SOURCE_DOCUMENT_COLUMNS = [
    'id',
    'user_id',
    'kind',
    'title',
    'origin_type',
    'source_url',
    'mime_type',
    'status',
    'extraction_method',
    'extraction_version',
    'extraction_warnings',
    'fetched_at',
    'approved_at',
    'created_at',
    'updated_at',
].join(',');

const SOURCE_FRAGMENT_COLUMNS = [
    'id',
    'source_document_id',
    'user_id',
    'locator',
    'content',
    'created_at',
].join(',');

export type JobTargetSourceLinkInput = z.infer<typeof sourceLinkSchema>;

export type JobTargetRegistrationInput = {
    company: unknown;
    role: unknown;
    employmentType?: unknown;
    seniority?: unknown;
    deadline?: unknown;
    sourceLinks?: unknown;
};

export type JobTargetUpdateInput = Partial<JobTargetRegistrationInput> & { status?: unknown };

export type JobTargetSourceDetails = {
    sourceDocumentId: string;
    sourceRole: JobTargetSourceRole;
    isPrimary: boolean;
    sourceDocument: SourceDocument;
};

export type JobTargetDetails = {
    target: JobTarget;
    sources: JobTargetSourceDetails[];
    requirements: JobRequirement[];
    fragmentPreviews: Record<string, JobRequirementSourcePreview>;
};

export type JobRequirementSourcePreview = {
    id: string;
    sourceDocumentId: string;
    sourceTitle: string;
    content: string;
    locator: Record<string, unknown>;
};

export type JobAnalysisFragment = {
    id: string;
    sourceDocumentId: string;
    sourceTitle: string;
    sourceKind: SourceDocument['kind'];
    content: string;
    locator: Record<string, unknown>;
};

export type JobAnalysisContext = {
    target: JobTarget;
    sources: JobTargetSourceDetails[];
    fragments: JobAnalysisFragment[];
};

export type JobRequirementDraft = {
    category: JobRequirementCategory;
    text: string;
    priority: number;
    confidence?: number;
    sourceFragmentId: string;
};

export class JobTargetServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'analysis' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 409 | 422 | 500 = 500,
    ) {
        super(message);
        this.name = 'JobTargetServiceError';
    }
}

function nullableString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function nullableNumber(value: unknown): number | undefined {
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) throw new JobTargetServiceError('unauthorized', 'Unauthorized', 401);
    return user.id;
}

async function getAuthenticatedUserId(): Promise<{ supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }> {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, userId: getUserIdOrThrow(user) };
}

function mapJobTargetRecord(record: Record<string, unknown>): JobTarget {
    return JobTargetSchema.parse({
        id: record.id,
        userId: record.user_id,
        company: record.company,
        role: record.role,
        employmentType: nullableString(record.employment_type),
        seniority: nullableString(record.seniority),
        deadline: nullableString(record.deadline),
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapSourceDocumentRecord(record: Record<string, unknown>): SourceDocument {
    return SourceDocumentSchema.parse({
        id: record.id,
        userId: record.user_id,
        kind: record.kind,
        title: record.title,
        originType: record.origin_type,
        sourceUrl: nullableString(record.source_url),
        mimeType: nullableString(record.mime_type),
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

function mapRequirementRecord(record: Record<string, unknown>): JobRequirement {
    return JobRequirementSchema.parse({
        id: record.id,
        jobTargetId: record.job_target_id,
        userId: record.user_id,
        category: record.category,
        text: record.text,
        priority: nullableNumber(record.priority) ?? 0,
        confidence: nullableNumber(record.confidence),
        sourceFragmentId: nullableString(record.source_fragment_id),
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapInput(data: JobTargetRegistrationInput) {
    const parsed = jobTargetCreateSchema.safeParse({
        company: data.company,
        role: data.role,
        employmentType: data.employmentType,
        seniority: data.seniority,
        deadline: data.deadline,
        sourceLinks: data.sourceLinks,
    });
    if (!parsed.success) {
        throw new JobTargetServiceError('invalid_input', '회사, 직무, 자료 연결 정보를 확인해 주세요.', 400);
    }
    return parsed.data;
}

function mapUpdateInput(data: JobTargetUpdateInput) {
    const parsed = jobTargetUpdateSchema.safeParse({
        company: data.company,
        role: data.role,
        employmentType: data.employmentType,
        seniority: data.seniority,
        deadline: data.deadline,
        sourceLinks: data.sourceLinks,
        status: data.status,
    });
    if (!parsed.success || Object.values(parsed.data).every(value => value === undefined)) {
        throw new JobTargetServiceError('invalid_input', '수정할 지원 대상 정보를 확인해 주세요.', 400);
    }
    return parsed.data;
}

function parseId(id: unknown): string {
    const parsed = DomainIdSchema.safeParse(id);
    if (!parsed.success) throw new JobTargetServiceError('invalid_input', '지원 대상 ID를 확인해 주세요.', 400);
    return parsed.data;
}

async function fetchTarget(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, targetId: string, userId: string): Promise<JobTarget> {
    const { data, error } = await supabase
        .from('job_targets')
        .select('*')
        .eq('id', targetId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new JobTargetServiceError('not_found', '지원 대상을 찾을 수 없습니다.', 404);
    return mapJobTargetRecord(data as Record<string, unknown>);
}

async function validateSourceLinks(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    sourceLinks: JobTargetSourceLinkInput[],
    userId: string,
): Promise<void> {
    const uniqueIds = [...new Set(sourceLinks.map(link => link.sourceDocumentId))];
    if (uniqueIds.length !== sourceLinks.length) {
        throw new JobTargetServiceError('invalid_input', '같은 자료를 여러 번 연결할 수 없습니다.', 400);
    }
    if (uniqueIds.length === 0) return;

    const { data, error } = await supabase
        .from('source_documents')
        .select('id, kind, user_id')
        .in('id', uniqueIds)
        .eq('user_id', userId);
    if (error) throw error;

    const sourceKinds = new Map((data ?? []).map(record => [record.id as string, record.kind as string]));
    if (sourceKinds.size !== uniqueIds.length) {
        throw new JobTargetServiceError('invalid_input', '연결하려는 자료를 찾을 수 없거나 접근할 수 없습니다.', 400);
    }

    for (const link of sourceLinks) {
        const sourceKind = sourceKinds.get(link.sourceDocumentId);
        const roleMatchesKind = (
            (link.sourceRole === 'job_post' && sourceKind === 'job_post')
            || (link.sourceRole === 'talent' && sourceKind === 'talent_page')
            || (link.sourceRole === 'company' && sourceKind === 'other')
            || link.sourceRole === 'manual'
        );
        if (!roleMatchesKind) {
            throw new JobTargetServiceError('invalid_input', '자료 종류와 연결 역할이 일치하지 않습니다.', 400);
        }
    }
}

async function syncSourceLinks(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    targetId: string,
    sourceLinks: JobTargetSourceLinkInput[],
    userId: string,
): Promise<void> {
    await validateSourceLinks(supabase, sourceLinks, userId);

    const { error: deleteError } = await supabase
        .from('job_target_sources')
        .delete()
        .eq('job_target_id', targetId)
        .eq('user_id', userId);
    if (deleteError) throw deleteError;
    if (sourceLinks.length === 0) return;

    const { error: insertError } = await supabase
        .from('job_target_sources')
        .insert(sourceLinks.map(link => ({
            job_target_id: targetId,
            source_document_id: link.sourceDocumentId,
            user_id: userId,
            source_role: link.sourceRole,
            is_primary: link.isPrimary,
        })));
    if (insertError) throw insertError;
}

async function fetchSourceDetails(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    targetId: string,
    userId: string,
): Promise<JobTargetSourceDetails[]> {
    const { data: links, error: linkError } = await supabase
        .from('job_target_sources')
        .select('source_document_id, source_role, is_primary')
        .eq('job_target_id', targetId)
        .eq('user_id', userId);
    if (linkError) throw linkError;
    if (!links || links.length === 0) return [];

    const linkRows = links as unknown as Array<Record<string, unknown>>;
    const sourceIds = linkRows.map(link => link.source_document_id as string);
    const { data: documents, error: documentError } = await supabase
        .from('source_documents')
        .select(SOURCE_DOCUMENT_COLUMNS)
        .in('id', sourceIds)
        .eq('user_id', userId);
    if (documentError) throw documentError;

    const documentRows = (documents ?? []) as unknown as Array<Record<string, unknown>>;
    const documentsById = new Map(documentRows.map(record => {
        const document = mapSourceDocumentRecord(record);
        return [document.id, document] as const;
    }));

    return linkRows.flatMap(link => {
        const sourceDocumentId = link.source_document_id as string;
        const sourceDocument = documentsById.get(sourceDocumentId);
        if (!sourceDocument) return [];
        return [{
            sourceDocumentId,
            sourceRole: link.source_role as JobTargetSourceRole,
            isPrimary: Boolean(link.is_primary),
            sourceDocument,
        }];
    });
}

async function fetchRequirements(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    targetId: string,
    userId: string,
): Promise<JobRequirement[]> {
    const { data, error } = await supabase
        .from('job_requirements')
        .select('*')
        .eq('job_target_id', targetId)
        .eq('user_id', userId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(record => mapRequirementRecord(record as Record<string, unknown>));
}

async function fetchFragmentPreviews(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    requirements: JobRequirement[],
    sources: JobTargetSourceDetails[],
    userId: string,
): Promise<Record<string, JobRequirementSourcePreview>> {
    const fragmentIds = [...new Set(requirements.flatMap(requirement => requirement.sourceFragmentId ? [requirement.sourceFragmentId] : []))];
    if (fragmentIds.length === 0) return {};

    const { data, error } = await supabase
        .from('source_fragments')
        .select('id, source_document_id, locator, content')
        .in('id', fragmentIds)
        .eq('user_id', userId);
    if (error) throw error;

    const sourceById = new Map(sources.map(source => [source.sourceDocumentId, source]));
    return (data ?? []).reduce<Record<string, JobRequirementSourcePreview>>((previews, record) => {
        const id = record.id as string;
        const sourceDocumentId = record.source_document_id as string;
        const source = sourceById.get(sourceDocumentId);
        if (!source || typeof record.content !== 'string') return previews;
        previews[id] = {
            id,
            sourceDocumentId,
            sourceTitle: source.sourceDocument.title,
            content: record.content.slice(0, 500),
            locator: (record.locator ?? {}) as Record<string, unknown>,
        };
        return previews;
    }, {});
}

async function fetchDetails(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    target: JobTarget,
    userId: string,
): Promise<JobTargetDetails> {
    const [sources, requirements] = await Promise.all([
        fetchSourceDetails(supabase, target.id, userId),
        fetchRequirements(supabase, target.id, userId),
    ]);
    const fragmentPreviews = await fetchFragmentPreviews(supabase, requirements, sources, userId);
    return { target, sources, requirements, fragmentPreviews };
}

export const jobTargetService = {
    async list(options: { limit?: unknown } = {}): Promise<JobTarget[]> {
        const parsedOptions = jobTargetListSchema.safeParse(options);
        if (!parsedOptions.success) {
            throw new JobTargetServiceError('invalid_input', '목록 조건을 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedUserId();
        const { data, error } = await supabase
            .from('job_targets')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(parsedOptions.data.limit);
        if (error) throw error;
        return (data ?? []).map(record => mapJobTargetRecord(record as Record<string, unknown>));
    },

    async get(id: unknown): Promise<JobTargetDetails> {
        const targetId = parseId(id);
        const { supabase, userId } = await getAuthenticatedUserId();
        const target = await fetchTarget(supabase, targetId, userId);
        return fetchDetails(supabase, target, userId);
    },

    async create(input: JobTargetRegistrationInput): Promise<JobTargetDetails> {
        const parsed = mapInput(input);
        const { supabase, userId } = await getAuthenticatedUserId();
        const { data, error } = await supabase
            .from('job_targets')
            .insert({
                user_id: userId,
                company: parsed.company,
                role: parsed.role,
                employment_type: parsed.employmentType || null,
                seniority: parsed.seniority || null,
                deadline: parsed.deadline || null,
                status: 'draft',
            })
            .select('*')
            .single();
        if (error) throw error;

        const target = mapJobTargetRecord(data as Record<string, unknown>);
        try {
            if (parsed.sourceLinks) {
                await syncSourceLinks(supabase, target.id, parsed.sourceLinks, userId);
            }
            return fetchDetails(supabase, target, userId);
        } catch (error) {
            await supabase.from('job_targets').delete().eq('id', target.id).eq('user_id', userId);
            throw error;
        }
    },

    async update(id: unknown, input: JobTargetUpdateInput): Promise<JobTargetDetails> {
        const targetId = parseId(id);
        const parsed = mapUpdateInput(input);
        const { supabase, userId } = await getAuthenticatedUserId();
        await fetchTarget(supabase, targetId, userId);

        const updateRecord: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (parsed.company !== undefined) updateRecord.company = parsed.company;
        if (parsed.role !== undefined) updateRecord.role = parsed.role;
        if (parsed.employmentType !== undefined) updateRecord.employment_type = parsed.employmentType || null;
        if (parsed.seniority !== undefined) updateRecord.seniority = parsed.seniority || null;
        if (parsed.deadline !== undefined) updateRecord.deadline = parsed.deadline || null;
        if (parsed.status !== undefined) updateRecord.status = parsed.status;

        const { data, error } = await supabase
            .from('job_targets')
            .update(updateRecord)
            .eq('id', targetId)
            .eq('user_id', userId)
            .select('*')
            .single();
        if (error) throw error;

        if (parsed.sourceLinks !== undefined) {
            await syncSourceLinks(supabase, targetId, parsed.sourceLinks, userId);
        }
        return fetchDetails(supabase, mapJobTargetRecord(data as Record<string, unknown>), userId);
    },

    async getAnalysisContext(id: unknown): Promise<JobAnalysisContext> {
        const targetId = parseId(id);
        const { supabase, userId } = await getAuthenticatedUserId();
        const target = await fetchTarget(supabase, targetId, userId);
        const sources = await fetchSourceDetails(supabase, targetId, userId);
        const approvedSources = sources.filter(source => source.sourceDocument.status === 'approved');
        if (approvedSources.length === 0) {
            throw new JobTargetServiceError('analysis', '분석하려면 먼저 연결한 자료를 검수 완료로 바꿔 주세요.', 422);
        }

        const approvedIds = approvedSources.map(source => source.sourceDocumentId);
        const { data: fragments, error } = await supabase
            .from('source_fragments')
            .select(SOURCE_FRAGMENT_COLUMNS)
            .in('source_document_id', approvedIds)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(500);
        if (error) throw error;

        const sourceById = new Map(approvedSources.map(source => [source.sourceDocumentId, source]));
        const fragmentRows = (fragments ?? []) as unknown as Array<Record<string, unknown>>;
        const analysisFragments = fragmentRows.flatMap(record => {
            const sourceDocumentId = record.source_document_id as string;
            const source = sourceById.get(sourceDocumentId);
            if (!source || typeof record.content !== 'string') return [];
            return [{
                id: record.id as string,
                sourceDocumentId,
                sourceTitle: source.sourceDocument.title,
                sourceKind: source.sourceDocument.kind,
                content: record.content,
                locator: (record.locator ?? {}) as Record<string, unknown>,
            }];
        });

        if (analysisFragments.length === 0) {
            throw new JobTargetServiceError('analysis', '분석할 원문 구간이 없습니다. 자료를 다시 등록해 주세요.', 422);
        }

        return { target, sources, fragments: analysisFragments };
    },

    async replaceSuggestedRequirements(id: unknown, drafts: JobRequirementDraft[]): Promise<JobTargetDetails> {
        const targetId = parseId(id);
        const { supabase, userId } = await getAuthenticatedUserId();
        const target = await fetchTarget(supabase, targetId, userId);
        if (drafts.length === 0) {
            throw new JobTargetServiceError('analysis', '저장할 요구사항 후보가 없습니다.', 422);
        }

        const sourceIds = new Set(
            (await fetchSourceDetails(supabase, targetId, userId))
                .filter(source => source.sourceDocument.status === 'approved')
                .map(source => source.sourceDocumentId),
        );
        const { data: fragmentRows, error: fragmentError } = await supabase
            .from('source_fragments')
            .select('id, source_document_id')
            .in('id', drafts.map(draft => draft.sourceFragmentId))
            .eq('user_id', userId);
        if (fragmentError) throw fragmentError;
        const validFragmentIds = new Set(
            (fragmentRows ?? [])
                .filter(row => sourceIds.has(row.source_document_id as string))
                .map(row => row.id as string),
        );
        if (drafts.some(draft => !validFragmentIds.has(draft.sourceFragmentId))) {
            throw new JobTargetServiceError('analysis', '요구사항 출처가 연결된 자료와 일치하지 않습니다.', 422);
        }

        const { error: deleteError } = await supabase
            .from('job_requirements')
            .delete()
            .eq('job_target_id', targetId)
            .eq('user_id', userId)
            .eq('status', 'suggested');
        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
            .from('job_requirements')
            .insert(drafts.map(draft => ({
                job_target_id: targetId,
                user_id: userId,
                category: draft.category,
                text: draft.text,
                priority: draft.priority,
                confidence: draft.confidence ?? null,
                source_fragment_id: draft.sourceFragmentId,
                status: 'suggested',
            })));
        if (insertError) throw insertError;

        const { data: updated, error: updateError } = await supabase
            .from('job_targets')
            .update({ status: 'analyzed', updated_at: new Date().toISOString() })
            .eq('id', targetId)
            .eq('user_id', userId)
            .select('*')
            .single();
        if (updateError) throw updateError;
        return fetchDetails(supabase, mapJobTargetRecord(updated as Record<string, unknown>), userId);
    },

    async updateRequirementStatus(targetIdInput: unknown, requirementIdInput: unknown, input: unknown): Promise<JobRequirement> {
        const targetId = parseId(targetIdInput);
        const requirementId = parseId(requirementIdInput);
        const parsedInput = requirementStatusUpdateSchema.safeParse(input);
        if (!parsedInput.success) {
            throw new JobTargetServiceError('invalid_input', '요구사항 상태를 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedUserId();
        await fetchTarget(supabase, targetId, userId);
        const { data, error } = await supabase
            .from('job_requirements')
            .update({ status: parsedInput.data.status, updated_at: new Date().toISOString() })
            .eq('id', requirementId)
            .eq('job_target_id', targetId)
            .eq('user_id', userId)
            .select('*')
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new JobTargetServiceError('not_found', '요구사항을 찾을 수 없습니다.', 404);
        return mapRequirementRecord(data as Record<string, unknown>);
    },
};
