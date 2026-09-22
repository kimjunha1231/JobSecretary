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
    status: z.enum(['approved', 'archived']).default('approved'),
});

const evidenceStatusUpdateSchema = z.object({
    status: z.enum(['approved', 'archived']),
});

const evidenceRecordExpectedVersionsSchema = z.object({
    recordVersion: z.number().int().min(1).max(10_000),
    careerItemVersion: z.number().int().min(1).max(10_000),
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
    sourceFragmentCount?: number;
};

export type EvidenceRecordHistoryEntry = {
    record: EvidenceRecord;
    careerItemSnapshot: CareerItem | null;
    sourceFragmentCount: number;
};

export class EvidenceRecordServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'forbidden' | 'invalid_input' | 'not_found' | 'conflict' | 'unavailable' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 403 | 404 | 409 | 500 | 503 = 500,
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
        revisionNumber: typeof record.revision_number === 'number' ? record.revision_number : 1,
        revisionOf: nullableString(record.revision_of),
        restoredFromId: nullableString(record.restored_from_id),
        confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
        version: record.version,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function getRpcPayload(data: unknown): { record: Record<string, unknown>; careerItem: Record<string, unknown>; sourceFragmentCount: number } {
    if (typeof data !== 'object' || data === null || !('record' in data) || !('careerItem' in data)) {
        throw new EvidenceRecordServiceError('storage', '활동 변경 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', 500);
    }
    const payload = data as Record<string, unknown>;
    if (typeof payload.record !== 'object' || payload.record === null
        || typeof payload.careerItem !== 'object' || payload.careerItem === null) {
        throw new EvidenceRecordServiceError('storage', '활동 변경 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', 500);
    }
    return {
        record: payload.record as Record<string, unknown>,
        careerItem: payload.careerItem as Record<string, unknown>,
        sourceFragmentCount: typeof payload.sourceFragmentCount === 'number' ? payload.sourceFragmentCount : 0,
    };
}

function mapRpcError(error: { code?: string } | null | undefined, fallbackMessage: string): EvidenceRecordServiceError {
    if (error?.code === 'P0002') {
        return new EvidenceRecordServiceError('not_found', '활동을 찾을 수 없습니다.', 404);
    }
    if (error?.code === '40001' || error?.code === '23505') {
        return new EvidenceRecordServiceError('conflict', '다른 화면에서 활동이 먼저 변경되었습니다. 새로고침 후 다시 시도해 주세요.', 409);
    }
    if (error?.code === '22023') {
        return new EvidenceRecordServiceError('invalid_input', '활동 내용을 확인해 주세요.', 400);
    }
    if (error?.code === '42501') {
        return new EvidenceRecordServiceError('forbidden', '활동을 변경할 권한이 없습니다.', 403);
    }
    if (error?.code === 'PGRST202' || error?.code === 'PGRST204' || error?.code === 'PGRST205'
        || error?.code === '42883' || error?.code === '42703' || error?.code === '42P01') {
        return new EvidenceRecordServiceError('unavailable', '활동 버전 기능을 사용할 수 없습니다. 데이터베이스 업데이트가 필요합니다.', 503);
    }
    return new EvidenceRecordServiceError('storage', fallbackMessage, 500);
}

function mapRpcDetails(data: unknown): EvidenceRecordDetails {
    const payload = getRpcPayload(data);
    return {
        record: mapEvidenceRecord(payload.record),
        careerItem: mapCareerItem(payload.careerItem),
        sourceFragmentCount: payload.sourceFragmentCount,
    };
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

async function attachSourceFragmentCounts(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    details: EvidenceRecordDetails[],
): Promise<EvidenceRecordDetails[]> {
    if (details.length === 0) return [];
    const recordIds = details.map(item => item.record.id);
    const { data, error } = await supabase
        .from('evidence_sources')
        .select('evidence_record_id, source_fragment_id')
        .in('evidence_record_id', recordIds)
        .eq('user_id', userId);
    if (error) throw error;

    const fragmentsByRecord = new Map<string, Set<string>>();
    for (const row of data ?? []) {
        const recordId = String(row.evidence_record_id);
        const fragmentId = String(row.source_fragment_id);
        const fragments = fragmentsByRecord.get(recordId) ?? new Set<string>();
        fragments.add(fragmentId);
        fragmentsByRecord.set(recordId, fragments);
    }

    return details.map(item => ({
        ...item,
        sourceFragmentCount: fragmentsByRecord.get(item.record.id)?.size ?? 0,
    }));
}

export const evidenceRecordService = {
    async listApproved(options: { limit?: unknown; status?: unknown } = {}): Promise<EvidenceRecordDetails[]> {
        const parsedOptions = evidenceListSchema.safeParse(options);
        if (!parsedOptions.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 목록 조건을 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('evidence_records')
            .select('*')
            .eq('user_id', userId)
            .eq('status', parsedOptions.data.status)
            .order('updated_at', { ascending: false })
            .limit(parsedOptions.data.limit);
        if (error) throw error;
        const records = (data ?? []).map(row => mapEvidenceRecord(row as Record<string, unknown>));
        const details = await attachCareerItems(supabase, userId, records);
        const consistentDetails = details.filter(item => item.careerItem.status === parsedOptions.data.status);
        return attachSourceFragmentCounts(supabase, userId, consistentDetails);
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

        return {
            careerItem,
            record: mapEvidenceRecord(evidenceData as Record<string, unknown>),
            sourceFragmentCount: sourceFragments.length,
        };
    },

    async updateManual(id: string, input: ManualEvidenceInput, expectedVersions: unknown): Promise<EvidenceRecordDetails> {
        const parsedId = DomainIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 ID를 확인해 주세요.', 400);
        }
        const parsedExpectedVersions = evidenceRecordExpectedVersionsSchema.safeParse(expectedVersions);
        if (!parsedExpectedVersions.success) {
            throw new EvidenceRecordServiceError('invalid_input', '수정 중인 활동의 버전 정보를 확인해 주세요. 새로고침 후 다시 시도해 주세요.', 400);
        }
        const parsed = manualEvidenceSchema.safeParse(input);
        if (!parsed.success) {
            throw new EvidenceRecordServiceError('invalid_input', parsed.error.issues[0]?.message ?? '활동 근거를 확인해 주세요.', 400);
        }
        if (parsed.data.sourceFragmentIds.length > 0) {
            throw new EvidenceRecordServiceError('invalid_input', '수정 요청에는 원본 출처 ID를 포함할 수 없습니다.', 400);
        }

        const { supabase, userId } = await getAuthenticatedClient();
        const { data: evidenceData, error: evidenceReadError } = await supabase
            .from('evidence_records')
            .select('*')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (evidenceReadError) throw evidenceReadError;
        if (!evidenceData) throw new EvidenceRecordServiceError('not_found', '수정할 활동을 찾을 수 없습니다.', 404);

        const currentEvidence = evidenceData as Record<string, unknown>;
        const { data: careerData, error: careerReadError } = await supabase
            .from('career_items')
            .select('*')
            .eq('id', currentEvidence.career_item_id)
            .eq('user_id', userId)
            .maybeSingle();
        if (careerReadError) throw careerReadError;
        if (!careerData) throw new EvidenceRecordServiceError('not_found', '수정할 활동을 찾을 수 없습니다.', 404);
        const currentCareer = careerData as Record<string, unknown>;
        if (currentEvidence.status !== 'approved' || currentCareer.status !== 'approved'
            || Number(currentEvidence.version) !== parsedExpectedVersions.data.recordVersion
            || Number(currentCareer.version) !== parsedExpectedVersions.data.careerItemVersion) {
            throw new EvidenceRecordServiceError('conflict', '활동이 다른 화면에서 먼저 변경되었습니다. 새로고침 후 다시 시도해 주세요.', 409);
        }
        const { data: revisionData, error: revisionError } = await supabase.rpc('revise_evidence_activity', {
            p_record_id: parsedId.data,
            p_expected_record_version: parsedExpectedVersions.data.recordVersion,
            p_expected_career_version: parsedExpectedVersions.data.careerItemVersion,
            p_title: parsed.data.title,
            p_kind: parsed.data.kind,
            p_organization: parsed.data.organization || null,
            p_role: parsed.data.role || null,
            p_started_at: parsed.data.startedAt || null,
            p_ended_at: parsed.data.endedAt || null,
            p_is_current: parsed.data.isCurrent,
            p_summary: parsed.data.summary || null,
            p_action: parsed.data.action || null,
            p_result: parsed.data.result || null,
            p_learning: parsed.data.learning || null,
        });
        if (revisionError) throw mapRpcError(revisionError, '활동 수정 중 문제가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
        return mapRpcDetails(revisionData);
    },

    async updateStatus(id: string, input: unknown): Promise<EvidenceRecordDetails> {
        const parsedId = DomainIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 ID를 확인해 주세요.', 400);
        }
        const parsed = evidenceStatusUpdateSchema.safeParse(input);
        if (!parsed.success) {
            throw new EvidenceRecordServiceError('invalid_input', '활동 상태를 확인해 주세요.', 400);
        }

        const { supabase, userId } = await getAuthenticatedClient();
        const { data: evidenceData, error: evidenceReadError } = await supabase
            .from('evidence_records')
            .select('*')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (evidenceReadError) throw evidenceReadError;
        if (!evidenceData) throw new EvidenceRecordServiceError('not_found', '활동을 찾을 수 없습니다.', 404);

        const currentEvidence = evidenceData as Record<string, unknown>;
        const { data: careerData, error: careerReadError } = await supabase
            .from('career_items')
            .select('*')
            .eq('id', currentEvidence.career_item_id)
            .eq('user_id', userId)
            .maybeSingle();
        if (careerReadError) throw careerReadError;
        if (!careerData) throw new EvidenceRecordServiceError('not_found', '활동을 찾을 수 없습니다.', 404);
        const { data: statusData, error: statusError } = await supabase.rpc('set_evidence_activity_status', {
            p_record_id: parsedId.data,
            p_expected_record_version: Number(currentEvidence.version),
            p_expected_career_version: Number((careerData as Record<string, unknown>).version),
            p_next_status: parsed.data.status,
        });
        if (statusError) throw mapRpcError(statusError, '활동 상태를 변경하지 못했습니다.');
        return mapRpcDetails(statusData);
    },

    async getHistory(id: string): Promise<EvidenceRecordHistoryEntry[]> {
        const parsedId = DomainIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new EvidenceRecordServiceError('invalid_input', '근거 ID를 확인해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const { data: requestedRecordData, error: requestedRecordError } = await supabase
            .from('evidence_records')
            .select('id, career_item_id')
            .eq('id', parsedId.data)
            .eq('user_id', userId)
            .maybeSingle();
        if (requestedRecordError) throw requestedRecordError;
        if (!requestedRecordData) throw new EvidenceRecordServiceError('not_found', '활동을 찾을 수 없습니다.', 404);

        const careerItemId = String((requestedRecordData as Record<string, unknown>).career_item_id);
        const pageSize = 100;
        const records: Record<string, unknown>[] = [];
        for (let offset = 0; ; offset += pageSize) {
            const { data: pageData, error: pageError } = await supabase
                .from('evidence_records')
                .select('*')
                .eq('career_item_id', careerItemId)
                .eq('user_id', userId)
                .in('status', ['approved', 'superseded', 'archived'])
                .order('revision_number', { ascending: false })
                .order('created_at', { ascending: false })
                .order('id', { ascending: true })
                .range(offset, offset + pageSize - 1);
            if (pageError) throw mapRpcError(pageError, '활동 버전을 불러오지 못했습니다.');
            const page = (pageData ?? []).map(row => row as Record<string, unknown>);
            records.push(...page);
            if (page.length < pageSize) break;
        }
        if (records.length === 0) return [];
        const recordIds = records.map(record => String(record.id));
        const fragmentsByRecord = new Map<string, Set<string>>();
        for (let index = 0; index < recordIds.length; index += pageSize) {
            const { data: sourceRows, error: sourceError } = await supabase
                .from('evidence_sources')
                .select('evidence_record_id, source_fragment_id')
                .in('evidence_record_id', recordIds.slice(index, index + pageSize))
                .eq('user_id', userId);
            if (sourceError) throw mapRpcError(sourceError, '활동 버전을 불러오지 못했습니다.');
            for (const row of sourceRows ?? []) {
                const source = row as Record<string, unknown>;
                const recordId = String(source.evidence_record_id);
                const fragments = fragmentsByRecord.get(recordId) ?? new Set<string>();
                fragments.add(String(source.source_fragment_id));
                fragmentsByRecord.set(recordId, fragments);
            }
        }

        return records.map(record => {
            const rawSnapshot = typeof record.career_item_snapshot === 'object' && record.career_item_snapshot !== null
                ? record.career_item_snapshot as Record<string, unknown>
                : null;
            const snapshot = rawSnapshot
                && rawSnapshot.id === record.career_item_id
                && rawSnapshot.user_id === userId
                ? mapCareerItem(rawSnapshot)
                : null;
            return {
                record: mapEvidenceRecord(record),
                careerItemSnapshot: snapshot,
                sourceFragmentCount: fragmentsByRecord.get(String(record.id))?.size ?? 0,
            };
        });
    },

    async restoreRevision(currentRecordId: string, targetRecordId: unknown): Promise<EvidenceRecordDetails> {
        const parsedCurrentId = DomainIdSchema.safeParse(currentRecordId);
        const parsedTargetId = DomainIdSchema.safeParse(targetRecordId);
        if (!parsedCurrentId.success || !parsedTargetId.success || parsedCurrentId.data === parsedTargetId.data) {
            throw new EvidenceRecordServiceError('invalid_input', '복원할 버전을 확인해 주세요.', 400);
        }

        const { supabase, userId } = await getAuthenticatedClient();
        const { data: recordsData, error: recordsError } = await supabase
            .from('evidence_records')
            .select('*')
            .in('id', [parsedCurrentId.data, parsedTargetId.data])
            .eq('user_id', userId);
        if (recordsError) throw mapRpcError(recordsError, '이전 활동 버전을 불러오지 못했습니다.');
        const records = (recordsData ?? []).map(row => row as Record<string, unknown>);
        const currentRecord = records.find(record => record.id === parsedCurrentId.data);
        const targetRecord = records.find(record => record.id === parsedTargetId.data);
        if (!currentRecord || !targetRecord) throw new EvidenceRecordServiceError('not_found', '활동 버전을 찾을 수 없습니다.', 404);
        if (!('revision_number' in targetRecord) || !('career_item_snapshot' in targetRecord)) {
            throw new EvidenceRecordServiceError('unavailable', '활동 버전 기능을 사용할 수 없습니다. 데이터베이스 업데이트가 필요합니다.', 503);
        }
        if (currentRecord.status !== 'approved' || targetRecord.status !== 'superseded'
            || currentRecord.career_item_id !== targetRecord.career_item_id
            || typeof targetRecord.career_item_snapshot !== 'object' || targetRecord.career_item_snapshot === null) {
            throw new EvidenceRecordServiceError('conflict', '현재 활동과 복원할 버전을 확인한 뒤 다시 시도해 주세요.', 409);
        }

        const { data: careerData, error: careerError } = await supabase
            .from('career_items')
            .select('id, version, status')
            .eq('id', currentRecord.career_item_id)
            .eq('user_id', userId)
            .maybeSingle();
        if (careerError) throw mapRpcError(careerError, '이전 활동 버전을 복원하지 못했습니다.');
        if (!careerData) throw new EvidenceRecordServiceError('not_found', '활동을 찾을 수 없습니다.', 404);
        const career = careerData as Record<string, unknown>;
        if (career.status !== 'approved') {
            throw new EvidenceRecordServiceError('conflict', '보관된 활동은 먼저 복원한 뒤 이전 버전을 선택해 주세요.', 409);
        }

        const { data: restoreData, error: restoreError } = await supabase.rpc('restore_evidence_activity_revision', {
            p_current_record_id: parsedCurrentId.data,
            p_target_record_id: parsedTargetId.data,
            p_expected_current_record_version: Number(currentRecord.version),
            p_expected_career_version: Number(career.version),
            p_expected_target_record_version: Number(targetRecord.version),
        });
        if (restoreError) throw mapRpcError(restoreError, '이전 활동 버전을 복원하지 못했습니다.');
        return mapRpcDetails(restoreData);
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
        const activeDetails = details.filter(item => item.careerItem.status === 'approved');
        const detailsWithSourceCounts = await attachSourceFragmentCounts(supabase, userId, activeDetails);
        const byRecordId = new Map(detailsWithSourceCounts.map(item => [item.record.id, item] as const));
        return uniqueIds.flatMap(id => {
            const item = byRecordId.get(id);
            return item ? [item] : [];
        });
    },
};
