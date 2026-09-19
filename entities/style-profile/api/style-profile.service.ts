import { createServerSupabaseClient } from '@/shared/api/server';
import {
    StyleExampleSchema,
    StyleProfileSchema,
    type StyleExample,
    type StyleProfile,
} from '@/entities/style-profile/model';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';

const sentenceLengthSchema = z.object({
    min: z.coerce.number().int().min(1).max(10_000).optional(),
    max: z.coerce.number().int().min(1).max(10_000).optional(),
    average: z.coerce.number().min(0).max(10_000).optional(),
}).default({});

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
    exaggerationLevel: z.coerce.number().min(0).max(1).optional(),
    rules: rulesSchema,
});

const exampleInputSchema = z.object({
    source: z.enum(['user_authored', 'approved_final']).default('user_authored'),
    content: z.string().trim().min(1).max(20_000),
    approved: z.boolean().default(false),
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
): Promise<StyleExample[]> {
    let query = supabase
        .from('style_examples')
        .select('*')
        .eq('style_profile_id', profileId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (!includeUnapproved) query = query.eq('approved', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(row => mapExample(row as Record<string, unknown>));
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

    async getForGeneration(idInput: unknown): Promise<StyleProfileDetails | null> {
        if (!idInput) return null;
        const id = parseId(idInput, '말투 프로필 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const profile = await fetchProfile(supabase, id, userId);
        return { profile, examples: await fetchExamples(supabase, id, userId, false) };
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
        const { error } = await supabase.from('style_examples').insert({
            style_profile_id: profileId,
            user_id: userId,
            source: parsed.data.source,
            content: parsed.data.content,
            approved: parsed.data.approved,
        });
        if (error) throw error;
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

    async removeExample(exampleIdInput: unknown): Promise<void> {
        const exampleId = parseId(exampleIdInput, '말투 예문 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const { error } = await supabase.from('style_examples').delete().eq('id', exampleId).eq('user_id', userId);
        if (error) throw error;
    },
};

export { mapExample, mapProfile };
