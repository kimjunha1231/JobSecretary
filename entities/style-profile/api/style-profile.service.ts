import { createServerSupabaseClient } from '@/shared/api/server';
import {
    StyleExampleSchema,
    StyleProfileSchema,
    type StyleExample,
    type StyleProfile,
} from '@/entities/style-profile/model';
import { analyzeStyleExamples } from './style-profile-analysis';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';

const sentenceLengthSchema = z.object({
    min: z.coerce.number().int().min(1).max(10_000).optional(),
    max: z.coerce.number().int().min(1).max(10_000).optional(),
    average: z.coerce.number().min(0).max(10_000).optional(),
}).default({});

const exaggerationLevelSchema = z.preprocess(
    value => value === '' ? undefined : value,
    z.union([
        z.number().min(0).max(1),
        z.string()
            .trim()
            .min(1)
            .transform(value => Number(value))
            .refine(value => Number.isFinite(value) && value >= 0 && value <= 1, '과장 정도는 0과 1 사이여야 합니다.'),
        z.null(),
    ]).optional(),
);

const rulesSchema = z.record(z.unknown()).default({}).refine(value => {
    try {
        return JSON.stringify(value).length <= 10_000;
    } catch {
        return false;
    }
}, '말투 규칙은 10,000자 이내로 입력해 주세요.');

const profileInputSchema = z.object({
    name: z.string().trim().min(1).max(100),
    sentenceLength: sentenceLengthSchema.optional(),
    endingStyle: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    preferredConnectors: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    bannedExpressions: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    exaggerationLevel: exaggerationLevelSchema,
    rules: rulesSchema,
});

const exampleInputSchema = z.object({
    source: z.literal('user_authored').default('user_authored'),
    content: z.string().trim().min(1).max(20_000),
    approved: z.boolean().default(false),
    questionId: DomainIdSchema.optional(),
});

export type StyleProfileDetails = {
    profile: StyleProfile;
    examples: StyleExample[];
};

export type StyleProfileCreateInput = z.input<typeof profileInputSchema>;
export type StyleProfileUpdateInput = Partial<StyleProfileCreateInput>;
export type StyleExampleInput = z.input<typeof exampleInputSchema>;
export type StyleExampleUpdateInput = { approved?: unknown; content?: unknown };

export class StyleProfileServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'conflict' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 409 | 500 = 500,
    ) {
        super(message);
        this.name = 'StyleProfileServiceError';
    }
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) throw new StyleProfileServiceError('unauthorized', 'Unauthorized', 401);
    return user.id;
}

async function getAuthenticatedClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, userId: getUserIdOrThrow(user) };
}

function parseId(value: unknown, label = 'ID'): string {
    const parsed = DomainIdSchema.safeParse(value);
    if (!parsed.success) throw new StyleProfileServiceError('invalid_input', `${label}를 확인해 주세요.`, 400);
    return parsed.data;
}

function nullableNumber(value: unknown): number | undefined {
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function stringArray(value: unknown, max = 100): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()).slice(0, max)
        : [];
}

function objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isSourceExampleMigrationUnavailable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const record = error as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : '';
    const message = typeof record.message === 'string' ? record.message : '';
    return (code === '42703' || code === 'PGRST204' || code === 'PGRST205')
        && /source_document_id|style_examples/i.test(message);
}

function mapProfile(record: Record<string, unknown>): StyleProfile {
    const sentenceLength = objectValue(record.sentence_length);
    return StyleProfileSchema.parse({
        id: record.id,
        userId: record.user_id,
        name: record.name,
        sentenceLength: {
            min: nullableNumber(sentenceLength.min),
            max: nullableNumber(sentenceLength.max),
            average: nullableNumber(sentenceLength.average),
        },
        endingStyle: stringArray(record.ending_style, 20),
        preferredConnectors: stringArray(record.preferred_connectors),
        bannedExpressions: stringArray(record.banned_expressions),
        exaggerationLevel: nullableNumber(record.exaggeration_level),
        rules: objectValue(record.rules),
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapExample(record: Record<string, unknown>): StyleExample {
    return StyleExampleSchema.parse({
        id: record.id,
        styleProfileId: record.style_profile_id,
        userId: record.user_id,
        questionId: typeof record.question_id === 'string' ? record.question_id : undefined,
        sourceDocumentId: typeof record.source_document_id === 'string' ? record.source_document_id : undefined,
        source: record.source,
        content: record.content,
        approved: Boolean(record.approved),
        createdAt: record.created_at,
    });
}

async function fetchExamples(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    profileId: string,
    userId: string,
    includeUnapproved = true,
    questionId?: string,
): Promise<StyleExample[]> {
    let query = supabase
        .from('style_examples')
        .select('*')
        .eq('style_profile_id', profileId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (!includeUnapproved) query = query.eq('approved', true);
    if (questionId) query = query.or(`question_id.is.null,question_id.eq.${questionId}`);
    const { data, error } = await query;
    if (error) throw error;
    const examples = (data ?? []).map(row => mapExample(row as Record<string, unknown>));
    if (!questionId) return examples;

    // Keep examples written for the current question ahead of global style
    // examples. The generation context is intentionally capped, so this
    // deterministic ordering prevents unrelated older questions from taking
    // all available example slots.
    return examples.sort((left, right) => {
        const leftIsQuestionSpecific = left.questionId === questionId ? 1 : 0;
        const rightIsQuestionSpecific = right.questionId === questionId ? 1 : 0;
        return rightIsQuestionSpecific - leftIsQuestionSpecific
            || right.createdAt.localeCompare(left.createdAt)
            || left.id.localeCompare(right.id);
    });
}

async function fetchProfile(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    id: string,
    userId: string,
): Promise<StyleProfile> {
    const { data, error } = await supabase
        .from('style_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new StyleProfileServiceError('not_found', '말투 프로필을 찾을 수 없습니다.', 404);
    return mapProfile(data as Record<string, unknown>);
}

function parseProfileInput(input: StyleProfileCreateInput | StyleProfileUpdateInput, partial = false) {
    const schema = partial ? profileInputSchema.partial() : profileInputSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new StyleProfileServiceError('invalid_input', '말투 프로필 정보를 확인해 주세요.', 400);
    return parsed.data;
}

async function fetchQuestionOwner(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    questionId: string,
    userId: string,
): Promise<void> {
    const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('id')
        .eq('id', questionId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new StyleProfileServiceError('not_found', '자기소개서 문항을 찾을 수 없습니다.', 404);
}

async function fetchFinalizedQuestion(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    questionId: string,
    userId: string,
): Promise<string> {
    const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('id, final_answer, status')
        .eq('id', questionId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new StyleProfileServiceError('not_found', '자기소개서 문항을 찾을 수 없습니다.', 404);
    if (data.status !== 'finalized' || typeof data.final_answer !== 'string' || data.final_answer.trim().length === 0) {
        throw new StyleProfileServiceError('conflict', '최종 확정된 문항만 말투 예문으로 저장할 수 있습니다.', 409);
    }
    return data.final_answer;
}

async function fetchApprovedSourceDocument(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    sourceDocumentId: string,
    userId: string,
): Promise<{ id: string; rawText?: string; kind: string; title: string }> {
    const { data, error } = await supabase
        .from('source_documents')
        .select('id, kind, title, status, raw_text')
        .eq('id', sourceDocumentId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new StyleProfileServiceError('not_found', '기존 자기소개서 자료를 찾을 수 없습니다.', 404);
    if (data.kind !== 'cover_letter' || data.status !== 'approved') {
        throw new StyleProfileServiceError('conflict', '검수 완료한 기존 자기소개서만 말투 예문으로 가져올 수 있습니다.', 409);
    }

    return {
        id: data.id as string,
        kind: data.kind as string,
        title: data.title as string,
        rawText: typeof data.raw_text === 'string' ? data.raw_text : undefined,
    };
}

async function fetchSourceDocumentContent(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    sourceDocumentId: string,
    userId: string,
    rawText?: string,
): Promise<string> {
    const normalizedRawText = rawText?.trim();
    if (normalizedRawText) return normalizedRawText;

    const { data, error } = await supabase
        .from('source_fragments')
        .select('content')
        .eq('source_document_id', sourceDocumentId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? [])
        .map(row => typeof row.content === 'string' ? row.content.trim() : '')
        .filter(Boolean)
        .join('\n\n')
        .trim();
}

export const styleProfileService = {
    async list(): Promise<StyleProfileDetails[]> {
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('style_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return Promise.all((data ?? []).map(async row => {
            const profile = mapProfile(row as Record<string, unknown>);
            return { profile, examples: await fetchExamples(supabase, profile.id, userId) };
        }));
    },

    async get(idInput: unknown, options: { approvedOnly?: boolean } = {}): Promise<StyleProfileDetails> {
        const id = parseId(idInput, '말투 프로필 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const profile = await fetchProfile(supabase, id, userId);
        return { profile, examples: await fetchExamples(supabase, id, userId, !options.approvedOnly) };
    },

    async getForGeneration(idInput: unknown, options: { questionId?: unknown } = {}): Promise<StyleProfileDetails | null> {
        if (!idInput) return null;
        const id = parseId(idInput, '말투 프로필 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const profile = await fetchProfile(supabase, id, userId);
        const questionId = options.questionId ? parseId(options.questionId, '문항 ID') : undefined;
        if (questionId) await fetchQuestionOwner(supabase, questionId, userId);
        return { profile, examples: await fetchExamples(supabase, id, userId, false, questionId) };
    },

    async analyze(idInput: unknown) {
        const id = parseId(idInput, '말투 프로필 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        await fetchProfile(supabase, id, userId);
        const examples = await fetchExamples(supabase, id, userId, false);
        return analyzeStyleExamples(examples);
    },

    async create(input: StyleProfileCreateInput): Promise<StyleProfileDetails> {
        const parsed = parseProfileInput(input);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('style_profiles')
            .insert({
                user_id: userId,
                name: parsed.name,
                sentence_length: parsed.sentenceLength ?? {},
                ending_style: parsed.endingStyle,
                preferred_connectors: parsed.preferredConnectors,
                banned_expressions: parsed.bannedExpressions,
                exaggeration_level: parsed.exaggerationLevel ?? null,
                rules: parsed.rules,
            })
            .select('*')
            .single();
        if (error) throw error;
        const profile = mapProfile(data as Record<string, unknown>);
        return { profile, examples: [] };
    },

    async update(idInput: unknown, input: StyleProfileUpdateInput): Promise<StyleProfileDetails> {
        const id = parseId(idInput, '말투 프로필 ID');
        const parsed = parseProfileInput(input, true);
        if (Object.keys(parsed).length === 0) throw new StyleProfileServiceError('invalid_input', '수정할 말투 프로필 정보가 없습니다.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        await fetchProfile(supabase, id, userId);
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (parsed.name !== undefined) update.name = parsed.name;
        if (parsed.sentenceLength !== undefined) update.sentence_length = parsed.sentenceLength;
        if (parsed.endingStyle !== undefined) update.ending_style = parsed.endingStyle;
        if (parsed.preferredConnectors !== undefined) update.preferred_connectors = parsed.preferredConnectors;
        if (parsed.bannedExpressions !== undefined) update.banned_expressions = parsed.bannedExpressions;
        if (parsed.exaggerationLevel !== undefined) update.exaggeration_level = parsed.exaggerationLevel;
        if (parsed.rules !== undefined) update.rules = parsed.rules;
        const { data, error } = await supabase
            .from('style_profiles')
            .update(update)
            .eq('id', id)
            .eq('user_id', userId)
            .select('*')
            .single();
        if (error) throw error;
        return { profile: mapProfile(data as Record<string, unknown>), examples: await fetchExamples(supabase, id, userId) };
    },

    async addExample(profileIdInput: unknown, input: StyleExampleInput): Promise<StyleProfileDetails> {
        const profileId = parseId(profileIdInput, '말투 프로필 ID');
        const parsed = exampleInputSchema.safeParse(input);
        if (!parsed.success) throw new StyleProfileServiceError('invalid_input', '말투 예문을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        await fetchProfile(supabase, profileId, userId);
        if (parsed.data.questionId) await fetchQuestionOwner(supabase, parsed.data.questionId, userId);
        const { error } = await supabase.from('style_examples').insert({
            style_profile_id: profileId,
            user_id: userId,
            question_id: parsed.data.questionId ?? null,
            source: parsed.data.source,
            content: parsed.data.content,
            approved: parsed.data.approved,
        });
        if (error) throw error;
        const profile = await fetchProfile(supabase, profileId, userId);
        return { profile, examples: await fetchExamples(supabase, profileId, userId) };
    },

    /**
     * Imports one user-owned, already approved cover-letter source as a style
     * example. This is an explicit user action: the source remains separate
     * from factual evidence, and generation only sees it after approval.
     */
    async importSourceDocument(profileIdInput: unknown, sourceDocumentIdInput: unknown): Promise<StyleProfileDetails> {
        const profileId = parseId(profileIdInput, '말투 프로필 ID');
        const sourceDocumentId = parseId(sourceDocumentIdInput, '기존 자기소개서 자료 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        await fetchProfile(supabase, profileId, userId);
        const sourceDocument = await fetchApprovedSourceDocument(supabase, sourceDocumentId, userId);
        const content = await fetchSourceDocumentContent(supabase, sourceDocument.id, userId, sourceDocument.rawText);
        if (!content) {
            throw new StyleProfileServiceError('conflict', '기존 자기소개서 본문이 비어 있어 말투 예문으로 가져올 수 없습니다.', 409);
        }
        if (Array.from(content).length > 20_000) {
            throw new StyleProfileServiceError('invalid_input', '기존 자기소개서가 20,000자를 넘어 예문으로 가져올 수 없습니다. 필요한 문단만 직접 추가해 주세요.', 400);
        }

        const { data: existing, error: existingError } = await supabase
            .from('style_examples')
            .select('*')
            .eq('style_profile_id', profileId)
            .eq('user_id', userId)
            .eq('source_document_id', sourceDocument.id)
            .eq('source', 'source_document')
            .limit(1);
        if (existingError) {
            if (isSourceExampleMigrationUnavailable(existingError)) {
                throw new StyleProfileServiceError('conflict', '기존 자기소개서 말투 자료 기능을 사용하려면 관련 migration을 먼저 적용해 주세요.', 409);
            }
            throw existingError;
        }
        if (!existing?.[0]) {
            const { error } = await supabase.from('style_examples').insert({
                style_profile_id: profileId,
                user_id: userId,
                source_document_id: sourceDocument.id,
                source: 'source_document',
                content,
                approved: true,
            });
            if (error) {
                if (isSourceExampleMigrationUnavailable(error)) {
                    throw new StyleProfileServiceError('conflict', '기존 자기소개서 말투 자료 기능을 사용하려면 관련 migration을 먼저 적용해 주세요.', 409);
                }
                throw error;
            }
        }

        const profile = await fetchProfile(supabase, profileId, userId);
        return { profile, examples: await fetchExamples(supabase, profileId, userId) };
    },

    async updateExample(exampleIdInput: unknown, input: StyleExampleUpdateInput): Promise<StyleExample> {
        const exampleId = parseId(exampleIdInput, '말투 예문 ID');
        const parsed = z.object({ approved: z.boolean().optional(), content: z.string().trim().min(1).max(20_000).optional() }).safeParse(input);
        if (!parsed.success || Object.keys(parsed.data).length === 0) throw new StyleProfileServiceError('invalid_input', '수정할 말투 예문 정보를 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const update: Record<string, unknown> = {};
        if (parsed.data.approved !== undefined) update.approved = parsed.data.approved;
        if (parsed.data.content !== undefined) update.content = parsed.data.content;
        const { data, error } = await supabase
            .from('style_examples')
            .update(update)
            .eq('id', exampleId)
            .eq('user_id', userId)
            .select('*')
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new StyleProfileServiceError('not_found', '말투 예문을 찾을 수 없습니다.', 404);
        return mapExample(data as Record<string, unknown>);
    },

    async promoteFinalAnswer(profileIdInput: unknown, questionIdInput: unknown): Promise<StyleExample> {
        const profileId = parseId(profileIdInput, '말투 프로필 ID');
        const questionId = parseId(questionIdInput, '문항 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        await fetchProfile(supabase, profileId, userId);
        const finalAnswer = await fetchFinalizedQuestion(supabase, questionId, userId);
        if (Array.from(finalAnswer).length > 20_000) {
            throw new StyleProfileServiceError('invalid_input', '최종 답변이 말투 예문 최대 길이를 넘었습니다.', 400);
        }
        const { data: existing, error: existingError } = await supabase
            .from('style_examples')
            .select('*')
            .eq('style_profile_id', profileId)
            .eq('question_id', questionId)
            .eq('source', 'approved_final')
            .eq('content', finalAnswer)
            .limit(1);
        if (existingError) throw existingError;
        if (existing?.[0]) return mapExample(existing[0] as Record<string, unknown>);
        const { data, error } = await supabase
            .from('style_examples')
            .insert({
                style_profile_id: profileId,
                user_id: userId,
                question_id: questionId,
                source: 'approved_final',
                content: finalAnswer,
                approved: true,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapExample(data as Record<string, unknown>);
    },

    async removeExample(exampleIdInput: unknown): Promise<void> {
        const exampleId = parseId(exampleIdInput, '말투 예문 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const { error } = await supabase.from('style_examples').delete().eq('id', exampleId).eq('user_id', userId);
        if (error) throw error;
    },
};

export { mapExample, mapProfile };
