import { createServerSupabaseClient } from '@/shared/api/server';
import {
    CareerItemKindSchema,
    CareerItemSchema,
    type CareerItem,
} from '@/entities/career-item/model';
import {
    EvidenceMetricSchema,
    EvidenceRecordSchema,
    type EvidenceMetric,
    type EvidenceRecord,
} from '@/entities/evidence-record/model';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';

const evidenceListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

const manualEvidenceSchema = z.object({
    title: z.string().trim().min(1).max(200),
    kind: CareerItemKindSchema.default('project'),
    organization: z.string().trim().max(200).optional(),
    role: z.string().trim().max(200).optional(),
    startedAt: z.string().trim().max(100).optional(),
    endedAt: z.string().trim().max(100).optional(),
    isCurrent: z.boolean().default(false),
    summary: z.string().trim().max(10_000).optional(),
    contributionNote: z.string().trim().max(10_000).optional(),
    situation: z.string().trim().max(10_000).optional(),
    problem: z.string().trim().max(10_000).optional(),
    action: z.string().trim().max(10_000).optional(),
    result: z.string().trim().max(10_000).optional(),
    learning: z.string().trim().max(10_000).optional(),
    metrics: z.array(EvidenceMetricSchema).max(20).default([]),
    skills: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    competencyTags: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    sourceFragmentIds: z.array(DomainIdSchema).max(20).default([]),
}).refine(value => [value.summary, value.contributionNote, value.situation, value.problem, value.action, value.result, value.learning]
    .some(item => Boolean(item?.trim())) || value.metrics.length > 0, {
    message: '활동 설명이나 결과 근거를 하나 이상 입력해 주세요.',
});

export type ManualEvidenceInput = z.input<typeof manualEvidenceSchema>;

export type EvidenceRecordDetails = {
    record: EvidenceRecord;
    careerItem: CareerItem;
};

export class EvidenceRecordServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 500 = 500,
    ) {
        super(message);
        this.name = 'EvidenceRecordServiceError';
    }
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) throw new EvidenceRecordServiceError('unauthorized', 'Unauthorized', 401);
    return user.id;
}

async function getAuthenticatedClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, userId: getUserIdOrThrow(user) };
}

function nullableString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string').slice(0, 100)
        : [];
}

function mapCareerItem(record: Record<string, unknown>): CareerItem {
    return CareerItemSchema.parse({
        id: record.id,
        userId: record.user_id,
        kind: record.kind,
        title: record.title,
        organization: nullableString(record.organization),
        role: nullableString(record.role),
        startedAt: nullableString(record.started_at),
        endedAt: nullableString(record.ended_at),
        isCurrent: Boolean(record.is_current),
        summary: nullableString(record.summary),
        teamSize: typeof record.team_size === 'number' ? record.team_size : undefined,
        contributionNote: nullableString(record.contribution_note),
        skills: stringArray(record.skills),
        competencyTags: stringArray(record.competency_tags),
        status: record.status,
        version: record.version,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapEvidenceRecord(record: Record<string, unknown>): EvidenceRecord {
    return EvidenceRecordSchema.parse({
        id: record.id,
        careerItemId: record.career_item_id,
        userId: record.user_id,
        situation: nullableString(record.situation),
        problem: nullableString(record.problem),
        action: nullableString(record.action),
        result: nullableString(record.result),
        learning: nullableString(record.learning),
        metrics: Array.isArray(record.metrics) ? record.metrics : [],
        skills: stringArray(record.skills),
        competencyTags: stringArray(record.competency_tags),
        status: record.status,
        confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
        version: record.version,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

async function attachCareerItems(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    records: EvidenceRecord[],
): Promise<EvidenceRecordDetails[]> {
    if (records.length === 0) return [];
    const careerIds = [...new Set(records.map(record => record.careerItemId))];
    const { data, error } = await supabase
        .from('career_items')
        .select('*')
        .in('id', careerIds)
        .eq('user_id', userId);
    if (error) throw error;
    const careers = new Map((data ?? []).map(row => {
        const career = mapCareerItem(row as Record<string, unknown>);
        return [career.id, career] as const;
    }));
    return records.flatMap(record => {
        const careerItem = careers.get(record.careerItemId);
        return careerItem ? [{ record, careerItem }] : [];
    });
}

export const evidenceRecordService = {
    async listApproved(options: { limit?: unknown } = {}): Promise<EvidenceRecordDetails[]> {
        const parsedOptions = evidenceListSchema.safeParse(options);
        if (!parsedOptions.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 목록 조건을 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('evidence_records')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'approved')
            .order('updated_at', { ascending: false })
            .limit(parsedOptions.data.limit);
        if (error) throw error;
        const records = (data ?? []).map(row => mapEvidenceRecord(row as Record<string, unknown>));
        return attachCareerItems(supabase, userId, records);
    },

    async createManual(input: ManualEvidenceInput): Promise<EvidenceRecordDetails> {
        const parsed = manualEvidenceSchema.safeParse(input);
        if (!parsed.success) {
            throw new EvidenceRecordServiceError('invalid_input', parsed.error.issues[0]?.message ?? '활동 근거를 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const sourceFragmentIds = [...new Set(parsed.data.sourceFragmentIds)];
        const sourceFragments = sourceFragmentIds.length > 0
            ? await (async () => {
                const { data, error } = await supabase
                    .from('source_fragments')
                    .select('id, content')
                    .in('id', sourceFragmentIds)
                    .eq('user_id', userId);
                if (error) throw error;
                if ((data ?? []).length !== sourceFragmentIds.length) {
                    throw new EvidenceRecordServiceError('invalid_input', '출처 fragment를 확인해 주세요.', 400);
                }
                return data ?? [];
            })()
            : [];
        const careerInsert = {
            user_id: userId,
            kind: parsed.data.kind,
            title: parsed.data.title,
            organization: parsed.data.organization || null,
            role: parsed.data.role || null,
            started_at: parsed.data.startedAt || null,
            ended_at: parsed.data.endedAt || null,
            is_current: parsed.data.isCurrent,
            summary: parsed.data.summary || null,
            contribution_note: parsed.data.contributionNote || null,
            status: 'approved',
            version: 1,
        };
        const { data: careerData, error: careerError } = await supabase
            .from('career_items')
            .insert(careerInsert)
            .select('*')
            .single();
        if (careerError) throw careerError;

        const careerItem = mapCareerItem(careerData as Record<string, unknown>);
        const evidenceInsert = {
            career_item_id: careerItem.id,
            user_id: userId,
            situation: parsed.data.situation || null,
            problem: parsed.data.problem || null,
            action: parsed.data.action || null,
            result: parsed.data.result || null,
            learning: parsed.data.learning || null,
            metrics: parsed.data.metrics as EvidenceMetric[],
            skills: parsed.data.skills,
            competency_tags: parsed.data.competencyTags,
            status: 'approved',
            version: 1,
        };
        const { data: evidenceData, error: evidenceError } = await supabase
            .from('evidence_records')
            .insert(evidenceInsert)
            .select('*')
            .single();
        if (evidenceError) {
            await supabase.from('career_items').delete().eq('id', careerItem.id).eq('user_id', userId);
            throw evidenceError;
        }

        if (sourceFragments.length > 0) {
            const { error: sourceError } = await supabase.from('evidence_sources').insert(sourceFragments.map((fragment, index) => ({
                evidence_record_id: (evidenceData as Record<string, unknown>).id,
                source_fragment_id: fragment.id,
                user_id: userId,
                claim_type: 'action',
                quote_excerpt: String(fragment.content).slice(0, 2_000),
                is_primary: index === 0,
                metadata: { source: 'career_candidate_review' },
            })));
            if (sourceError) {
                await supabase.from('evidence_records').delete().eq('id', (evidenceData as Record<string, unknown>).id).eq('user_id', userId);
                await supabase.from('career_items').delete().eq('id', careerItem.id).eq('user_id', userId);
                throw sourceError;
            }
        }

        return { careerItem, record: mapEvidenceRecord(evidenceData as Record<string, unknown>) };
    },

    async getApprovedByIds(ids: string[]): Promise<EvidenceRecordDetails[]> {
        const parsedIds = z.array(DomainIdSchema).max(100).safeParse(ids);
        if (!parsedIds.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 ID를 확인해 주세요.', 400);
        }
        const uniqueIds = [...new Set(parsedIds.data)];
        if (uniqueIds.length === 0) return [];
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('evidence_records')
            .select('*')
            .in('id', uniqueIds)
            .eq('user_id', userId)
            .eq('status', 'approved');
        if (error) throw error;
        const details = await attachCareerItems(supabase, userId, (data ?? []).map(row => mapEvidenceRecord(row as Record<string, unknown>)));
        const byRecordId = new Map(details.map(item => [item.record.id, item] as const));
        return uniqueIds.flatMap(id => {
            const item = byRecordId.get(id);
            return item ? [item] : [];
        });
    },
};
