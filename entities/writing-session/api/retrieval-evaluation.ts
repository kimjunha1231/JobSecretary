import { z } from 'zod';
import { createServerSupabaseClient } from '@/shared/api/server';
import type { EvidenceRecordDetails } from '@/entities/evidence-record/api';
import type { JobRequirement } from '@/entities/job-target/model';
import { DomainIdSchema } from '@/shared/types';
import type { WritingSessionDetails } from './writing-session.service';
import { rankEvidence, WritingSessionServiceError, writingSessionService } from './writing-session.service';

const retrievalEvaluationOptionsSchema = z.object({
    k: z.number().int().min(1).max(100).default(3),
});

export const RetrievalEvaluationSummarySchema = z.object({
    k: z.number().int().min(1).max(100),
    caseCount: z.number().int().min(0),
    evaluatedCaseCount: z.number().int().min(0),
    emptyRelevantLabelCount: z.number().int().min(0),
    recallAtK: z.number().min(0).max(1),
    ndcgAtK: z.number().min(0).max(1),
    mrrAtK: z.number().min(0).max(1),
});
export type RetrievalEvaluationSummary = z.infer<typeof RetrievalEvaluationSummarySchema>;

export const RetrievalEvaluationAggregateSummarySchema = RetrievalEvaluationSummarySchema.extend({
    available: z.literal(true),
    sessionCount: z.number().int().min(0),
    evaluatedSessionCount: z.number().int().min(0),
});
export type RetrievalEvaluationAggregateSummary = z.infer<typeof RetrievalEvaluationAggregateSummarySchema>;

export const RetrievalEvaluationAggregateUnavailableSchema = z.object({ available: z.literal(false) });
export const RetrievalEvaluationAggregateResponseSchema = z.union([
    RetrievalEvaluationAggregateSummarySchema,
    RetrievalEvaluationAggregateUnavailableSchema,
]);
export type RetrievalEvaluationAggregateResponse = z.infer<typeof RetrievalEvaluationAggregateResponseSchema>;

export type RetrievalEvaluationCase = {
    requirement: JobRequirement;
    evidence: EvidenceRecordDetails[];
    relevantEvidenceIds: string[];
};

/**
 * A user-authored relevance label for one requirement. An empty evidence ID
 * list is intentional: it records that the user could not find a relevant
 * activity, rather than silently falling back to selected matches.
 */
export const RetrievalEvaluationLabelSchema = z.object({
    requirementId: DomainIdSchema,
    evidenceRecordIds: z.array(DomainIdSchema).max(100),
});
export type RetrievalEvaluationLabel = z.infer<typeof RetrievalEvaluationLabelSchema>;

const retrievalEvaluationLabelsInputSchema = z.object({
    labels: z.array(RetrievalEvaluationLabelSchema).max(100),
}).strict();

function isRetrievalLabelTableUnavailable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const record = error as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : '';
    const message = typeof record.message === 'string' ? record.message : '';
    return ['42P01', 'PGRST204', 'PGRST205'].includes(code)
        && /retrieval_evaluation_labels/i.test(message);
}

function normalizeRetrievalLabels(labels: RetrievalEvaluationLabel[]): RetrievalEvaluationLabel[] {
    const byRequirement = new Map<string, Set<string>>();
    for (const label of labels) {
        const evidenceIds = byRequirement.get(label.requirementId) ?? new Set<string>();
        label.evidenceRecordIds.forEach(id => evidenceIds.add(id));
        byRequirement.set(label.requirementId, evidenceIds);
    }
    return [...byRequirement.entries()].map(([requirementId, evidenceIds]) => ({
        requirementId,
        evidenceRecordIds: [...evidenceIds],
    }));
}

async function getAuthenticatedLabelsClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new WritingSessionServiceError('unauthorized', 'Unauthorized', 401);
    return { supabase, userId: user.id };
}

/**
 * Loads labels for the active question. Old deployments can run this code
 * before the additive migration is applied, so a missing table is deliberately
 * treated as “no explicit labels” and the evaluator keeps its legacy fallback.
 */
export async function listRetrievalLabels(sessionIdInput: unknown): Promise<RetrievalEvaluationLabel[]> {
    const sessionId = DomainIdSchema.safeParse(sessionIdInput);
    if (!sessionId.success) throw new WritingSessionServiceError('invalid_input', '작성 세션 ID를 확인해 주세요.', 400);
    const { supabase, userId } = await getAuthenticatedLabelsClient();
    const { data: session, error: sessionError } = await supabase
        .from('writing_sessions')
        .select('id, cover_letter_question_id')
        .eq('id', sessionId.data)
        .eq('user_id', userId)
        .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) throw new WritingSessionServiceError('not_found', '작성 세션을 찾을 수 없습니다.', 404);
    const questionId = typeof (session as Record<string, unknown>).cover_letter_question_id === 'string'
        ? (session as Record<string, unknown>).cover_letter_question_id as string
        : undefined;
    if (!questionId) return [];

    const { data, error } = await supabase
        .from('retrieval_evaluation_labels')
        .select('job_requirement_id, evidence_record_id')
        .eq('writing_session_id', sessionId.data)
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .order('job_requirement_id', { ascending: true })
        .order('evidence_record_id', { ascending: true, nullsFirst: true });
    if (error) {
        if (isRetrievalLabelTableUnavailable(error)) return [];
        throw error;
    }

    const grouped = new Map<string, Set<string>>();
    for (const row of data ?? []) {
        const record = row as Record<string, unknown>;
        const requirementId = typeof record.job_requirement_id === 'string' ? record.job_requirement_id : undefined;
        if (!requirementId) continue;
        const evidenceIds = grouped.get(requirementId) ?? new Set<string>();
        if (typeof record.evidence_record_id === 'string') evidenceIds.add(record.evidence_record_id);
        grouped.set(requirementId, evidenceIds);
    }
    return [...grouped.entries()].map(([requirementId, evidenceIds]) => ({
        requirementId,
        evidenceRecordIds: [...evidenceIds],
    }));
}

/**
 * Replaces only the current question's labels after re-checking the session,
 * approved requirements, and approved evidence on the server. The table keeps
 * IDs rather than source text, so the operation does not duplicate private
 * activity content.
 */
export async function replaceRetrievalLabels(
    sessionIdInput: unknown,
    input: unknown,
): Promise<RetrievalEvaluationLabel[]> {
    const sessionId = DomainIdSchema.safeParse(sessionIdInput);
    if (!sessionId.success) throw new WritingSessionServiceError('invalid_input', '작성 세션 ID를 확인해 주세요.', 400);
    const parsed = retrievalEvaluationLabelsInputSchema.safeParse(input);
    if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '검색 정답 라벨 형식을 확인해 주세요.', 400);

    const details = await writingSessionService.get(sessionId.data);
    const { supabase, userId } = await getAuthenticatedLabelsClient();
    const requirementIds = new Set(details.requirements.map(requirement => requirement.id));
    const evidenceIds = new Set(details.evidence.map(item => item.record.id));
    const normalized = normalizeRetrievalLabels(parsed.data.labels);
    if (normalized.some(label => !requirementIds.has(label.requirementId))) {
        throw new WritingSessionServiceError('invalid_input', '현재 공고의 승인된 요구사항만 라벨로 지정할 수 있습니다.', 400);
    }
    if (normalized.some(label => label.evidenceRecordIds.some(id => !evidenceIds.has(id)))) {
        throw new WritingSessionServiceError('invalid_input', '현재 승인된 활동만 검색 정답 라벨로 지정할 수 있습니다.', 400);
    }

    const baseQuery = supabase
        .from('retrieval_evaluation_labels')
        .delete()
        .eq('writing_session_id', details.session.id)
        .eq('question_id', details.question.id)
        .eq('user_id', userId);
    const { error: deleteError } = await baseQuery;
    if (deleteError) {
        if (isRetrievalLabelTableUnavailable(deleteError)) {
            throw new WritingSessionServiceError('storage', '검색 정답 라벨 기능이 아직 설정되지 않았습니다.', 500);
        }
        throw deleteError;
    }

    if (normalized.length === 0) return [];
    const rows = normalized.flatMap(label => {
        const values = label.evidenceRecordIds.length > 0 ? label.evidenceRecordIds : [null];
        return values.map(evidenceRecordId => ({
            user_id: userId,
            writing_session_id: details.session.id,
            question_id: details.question.id,
            job_requirement_id: label.requirementId,
            evidence_record_id: evidenceRecordId,
        }));
    });
    const { error: insertError } = await supabase.from('retrieval_evaluation_labels').insert(rows);
    if (insertError) {
        if (isRetrievalLabelTableUnavailable(insertError)) {
            throw new WritingSessionServiceError('storage', '검색 정답 라벨 기능이 아직 설정되지 않았습니다.', 500);
        }
        throw insertError;
    }
    return normalized;
}

/**
 * Builds evaluation labels from the evidence a user selected or locked in the
 * current writing session. Rejected and merely suggested matches are not
 * treated as relevant labels, and stale IDs are ignored when an approved
 * activity is no longer available in the session snapshot.
 */
export function buildEvidenceRetrievalCases(
    details: Pick<WritingSessionDetails, 'requirements' | 'evidence' | 'matches'>,
    labels: readonly RetrievalEvaluationLabel[] = [],
): RetrievalEvaluationCase[] {
    const approvedEvidenceIds = new Set(details.evidence.map(item => item.record.id));
    const relevantByRequirement = new Map<string, Set<string>>();
    const explicitByRequirement = new Map(labels.map(label => [label.requirementId, new Set(label.evidenceRecordIds.filter(id => approvedEvidenceIds.has(id)))]));

    for (const item of details.matches) {
        const requirementId = item.match.jobRequirementId;
        const evidenceId = item.match.evidenceRecordId;
        if (!requirementId || !approvedEvidenceIds.has(evidenceId)) continue;
        if (!['selected', 'locked'].includes(item.match.selectionState)) continue;
        const relevant = relevantByRequirement.get(requirementId) ?? new Set<string>();
        relevant.add(evidenceId);
        relevantByRequirement.set(requirementId, relevant);
    }

    return details.requirements.map(requirement => {
        // Presence in the map matters even when the explicit label is empty:
        // an authored “none is relevant” answer must not fall back to matches.
        const relevantEvidenceIds = explicitByRequirement.has(requirement.id)
            ? explicitByRequirement.get(requirement.id)!
            : (relevantByRequirement.get(requirement.id) ?? new Set<string>());
        return {
            requirement,
            evidence: details.evidence,
            relevantEvidenceIds: [...relevantEvidenceIds],
        };
    });
}

function roundMetric(value: number): number {
    return Math.round(value * 10_000) / 10_000;
}

function discountedGain(ranks: number[]): number {
    return ranks.reduce((total, rank) => total + (1 / Math.log2(rank + 1)), 0);
}

export function evaluateEvidenceRetrieval(
    cases: readonly RetrievalEvaluationCase[],
    options: { k?: number } = {},
): RetrievalEvaluationSummary {
    const parsedOptions = retrievalEvaluationOptionsSchema.safeParse(options);
    if (!parsedOptions.success) throw new Error('검색 평가의 k는 1에서 100 사이의 정수여야 합니다.');
    const k = parsedOptions.data.k;
    const evaluated = cases.map(item => {
        const relevantIds = new Set(item.relevantEvidenceIds);
        if (relevantIds.size === 0) return undefined;

        const ranked = rankEvidence(item.requirement, item.evidence, item.evidence.length);
        const relevantRanks = ranked
            .slice(0, k)
            .map((entry, index) => relevantIds.has(entry.evidence.record.id) ? index + 1 : 0)
            .filter((rank): rank is number => rank > 0);
        const recallAtK = relevantRanks.length / relevantIds.size;
        const idealRankCount = Math.min(k, relevantIds.size);
        const idealDcg = discountedGain(Array.from({ length: idealRankCount }, (_, index) => index + 1));
        const ndcgAtK = idealDcg === 0 ? 0 : discountedGain(relevantRanks) / idealDcg;
        const mrrAtK = relevantRanks.length > 0 ? 1 / relevantRanks[0] : 0;
        return { recallAtK, ndcgAtK, mrrAtK };
    }).filter((item): item is { recallAtK: number; ndcgAtK: number; mrrAtK: number } => Boolean(item));

    const average = (selector: (item: (typeof evaluated)[number]) => number) => evaluated.length === 0
        ? 0
        : evaluated.reduce((total, item) => total + selector(item), 0) / evaluated.length;

    return RetrievalEvaluationSummarySchema.parse({
        k,
        caseCount: cases.length,
        evaluatedCaseCount: evaluated.length,
        emptyRelevantLabelCount: cases.length - evaluated.length,
        recallAtK: roundMetric(average(item => item.recallAtK)),
        ndcgAtK: roundMetric(average(item => item.ndcgAtK)),
        mrrAtK: roundMetric(average(item => item.mrrAtK)),
    });
}
