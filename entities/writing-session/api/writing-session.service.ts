import { createServerSupabaseClient } from '@/shared/api/server';
import {
    evidenceRecordService,
    type EvidenceRecordDetails,
} from '@/entities/evidence-record/api';
import type { EvidenceRecord } from '@/entities/evidence-record/model';
import {
    CoverLetterQuestionStatusSchema,
    type CoverLetterQuestionStatus,
} from '@/entities/cover-letter/model';
import {
    JobRequirementSchema,
    JobTargetSchema,
    type JobRequirement,
    type JobTarget,
} from '@/entities/job-target/model';
import {
    EvidenceMatchSchema,
    EvidenceMatchSelectionSchema,
    OutlineCandidateSchema,
    WritingSessionSchema,
    type EvidenceMatch,
    type EvidenceMatchSelection,
    type OutlineCandidate,
    type WritingSession,
} from '@/entities/writing-session/model';
import {
    DraftCandidateSchema,
    DraftRevisionSchema,
    type DraftCandidate,
    type DraftRevision,
} from '@/entities/draft-candidate/model';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';

const sessionCreateSchema = z.object({
    jobTargetId: DomainIdSchema,
    question: z.string().trim().min(1).max(5_000),
    charLimit: z.coerce.number().int().min(100).max(100_000).default(700),
});

const sessionListSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

const evidenceSelectionSchema = z.object({
    selections: z.array(z.object({
        matchId: DomainIdSchema,
        selectionState: EvidenceMatchSelectionSchema,
    })).max(100),
});

const outlineSelectionSchema = z.object({
    status: z.literal('selected'),
});

const draftUpdateSchema = z.object({
    content: z.string().max(100_000).refine(value => value.trim().length > 0, '초안 내용을 입력해 주세요.'),
    draftId: DomainIdSchema.optional(),
});

const draftSelectionSchema = z.object({
    status: z.literal('selected'),
});

export type WritingSessionCreateInput = z.input<typeof sessionCreateSchema>;
export type EvidenceSelectionInput = z.input<typeof evidenceSelectionSchema>;
export type DraftUpdateInput = z.input<typeof draftUpdateSchema>;

export type WritingSessionQuestion = {
    id: string;
    coverLetterId: string;
    question: string;
    charLimit?: number;
    position: number;
    status: CoverLetterQuestionStatus;
    finalAnswer?: string;
};

export type EvidenceMatchDetails = {
    match: EvidenceMatch;
    evidence: EvidenceRecordDetails;
    requirement?: JobRequirement;
};

export type WritingSessionDetails = {
    session: WritingSession;
    target: JobTarget;
    question: WritingSessionQuestion;
    requirements: JobRequirement[];
    evidence: EvidenceRecordDetails[];
    matches: EvidenceMatchDetails[];
    outlines: OutlineCandidate[];
    drafts: DraftCandidate[];
    revisions: DraftRevision[];
};

export type WritingGenerationContext = WritingSessionDetails & {
    selectedEvidence: EvidenceRecordDetails[];
    selectedMatches: EvidenceMatchDetails[];
    selectedOutline: OutlineCandidate;
};

export class WritingSessionServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'conflict' | 'analysis' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 409 | 422 | 500 = 500,
    ) {
        super(message);
        this.name = 'WritingSessionServiceError';
    }
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) throw new WritingSessionServiceError('unauthorized', 'Unauthorized', 401);
    return user.id;
}

async function getAuthenticatedClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, userId: getUserIdOrThrow(user) };
}

function parseId(value: unknown, label = 'ID'): string {
    const parsed = DomainIdSchema.safeParse(value);
    if (!parsed.success) throw new WritingSessionServiceError('invalid_input', `${label}를 확인해 주세요.`, 400);
    return parsed.data;
}

function nullableString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function jsonObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function idArray(value: unknown): string[] {
    return stringArray(value).filter(value => DomainIdSchema.safeParse(value).success);
}

function mapTarget(record: Record<string, unknown>): JobTarget {
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

function mapQuestion(record: Record<string, unknown>): WritingSessionQuestion {
    return {
        id: record.id as string,
        coverLetterId: record.cover_letter_id as string,
        question: record.question as string,
        charLimit: numberOrUndefined(record.char_limit),
        position: typeof record.position === 'number' ? record.position : 0,
        status: CoverLetterQuestionStatusSchema.parse(record.status),
        finalAnswer: nullableString(record.final_answer),
    };
}

function mapSession(record: Record<string, unknown>): WritingSession {
    return WritingSessionSchema.parse({
        id: record.id,
        userId: record.user_id,
        jobTargetId: record.job_target_id,
        coverLetterQuestionId: record.cover_letter_question_id,
        state: record.state,
        styleProfileId: record.style_profile_id,
        generationSettings: jsonObject(record.generation_settings),
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        finalizedAt: nullableString(record.finalized_at),
    });
}

function mapMatch(record: Record<string, unknown>): EvidenceMatch {
    return EvidenceMatchSchema.parse({
        id: record.id,
        writingSessionId: record.writing_session_id,
        userId: record.user_id,
        jobRequirementId: nullableString(record.job_requirement_id),
        evidenceRecordId: record.evidence_record_id,
        retrievalScore: numberOrUndefined(record.retrieval_score),
        rerankScore: numberOrUndefined(record.rerank_score),
        reason: nullableString(record.reason),
        risks: stringArray(record.risks),
        selectionState: record.selection_state,
    });
}

function mapOutline(record: Record<string, unknown>): OutlineCandidate {
    return OutlineCandidateSchema.parse({
        id: record.id,
        writingSessionId: record.writing_session_id,
        userId: record.user_id,
        strategy: record.strategy,
        thesis: record.thesis,
        structure: stringArray(record.structure),
        evidenceRecordIds: idArray(record.evidence_record_ids),
        requirementIds: idArray(record.requirement_ids),
        status: record.status,
        createdAt: record.created_at,
    });
}

function mapDraft(record: Record<string, unknown>): DraftCandidate {
    const content = typeof record.content === 'string' ? record.content : '';
    return DraftCandidateSchema.parse({
        id: record.id,
        writingSessionId: record.writing_session_id,
        userId: record.user_id,
        outlineCandidateId: nullableString(record.outline_candidate_id),
        content,
        charCount: charLength(content),
        evidenceMap: jsonObject(record.evidence_map),
        validationResult: jsonObject(record.validation_result),
        model: nullableString(record.model),
        promptVersion: nullableString(record.prompt_version),
        generationRunId: nullableString(record.generation_run_id),
        status: record.status,
        createdAt: record.created_at,
    });
}

function mapRevision(record: Record<string, unknown>): DraftRevision {
    return DraftRevisionSchema.parse({
        id: record.id,
        writingSessionId: record.writing_session_id,
        userId: record.user_id,
        parentRevisionId: nullableString(record.parent_revision_id),
        content: record.content,
        editor: record.editor,
        changeReason: nullableString(record.change_reason),
        diffSummary: nullableString(record.diff_summary),
        createdAt: record.created_at,
    });
}

async function fetchSession(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    id: string,
    userId: string,
): Promise<WritingSession> {
    const { data, error } = await supabase
        .from('writing_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new WritingSessionServiceError('not_found', '작성 세션을 찾을 수 없습니다.', 404);
    return mapSession(data as Record<string, unknown>);
}

async function fetchQuestion(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    questionId: string,
    userId: string,
): Promise<WritingSessionQuestion> {
    const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('*')
        .eq('id', questionId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new WritingSessionServiceError('not_found', '작성 문항을 찾을 수 없습니다.', 404);
    return mapQuestion(data as Record<string, unknown>);
}

function tokenize(value: string): Set<string> {
    return new Set(value
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map(token => token.trim())
        .filter(token => token.length >= 2));
}

function evidenceSearchText(evidence: EvidenceRecordDetails): string {
    const { record, careerItem } = evidence;
    return [
        careerItem.title,
        careerItem.organization,
        careerItem.role,
        careerItem.summary,
        careerItem.contributionNote,
        record.situation,
        record.problem,
        record.action,
        record.result,
        record.learning,
        ...record.skills,
        ...record.competencyTags,
        ...careerItem.skills,
        ...careerItem.competencyTags,
    ].filter(Boolean).join(' ');
}

function scoreEvidence(requirement: JobRequirement, evidence: EvidenceRecordDetails): number {
    const requirementTokens = tokenize(requirement.text);
    const evidenceTokens = tokenize(evidenceSearchText(evidence));
    if (requirementTokens.size === 0 || evidenceTokens.size === 0) return 0.05;
    const overlap = [...requirementTokens].filter(token => evidenceTokens.has(token)).length;
    return Math.min(1, 0.1 + overlap / Math.max(requirementTokens.size, 1));
}

function matchReason(score: number, requirement: JobRequirement): string {
    if (score >= 0.6) return `“${requirement.text.slice(0, 60)}”와 직접 연결되는 활동입니다.`;
    if (score >= 0.3) return `“${requirement.text.slice(0, 60)}”에 활용할 수 있는 관련 활동입니다.`;
    return '직접 일치하는 단어는 적지만 사용자가 검토할 수 있는 활동 후보입니다.';
}

async function fetchTargetAndRequirements(jobTargetId: string): Promise<{ target: JobTarget; requirements: JobRequirement[] }> {
    const { jobTargetService } = await import('@/entities/job-target/api');
    const details = await jobTargetService.get(jobTargetId);
    return {
        target: details.target,
        requirements: details.requirements.filter(requirement => requirement.status === 'approved'),
    };
}

async function insertMatches(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    requirements: JobRequirement[],
    evidence: EvidenceRecordDetails[],
): Promise<void> {
    if (evidence.length === 0) return;
    const rows: Array<Record<string, unknown>> = [];
    if (requirements.length === 0) {
        evidence.slice(0, 10).forEach(item => rows.push({
            writing_session_id: sessionId,
            user_id: userId,
            evidence_record_id: item.record.id,
            retrieval_score: 0.05,
            rerank_score: 0.05,
            reason: '승인된 활동을 직접 선택해 사용할 수 있습니다.',
            risks: [],
            selection_state: 'suggested',
        }));
    } else {
        for (const requirement of requirements) {
            const ranked = [...evidence]
                .sort((left, right) => scoreEvidence(requirement, right) - scoreEvidence(requirement, left))
                .slice(0, 3);
            ranked.forEach(item => {
                const score = scoreEvidence(requirement, item);
                rows.push({
                    writing_session_id: sessionId,
                    user_id: userId,
                    job_requirement_id: requirement.id,
                    evidence_record_id: item.record.id,
                    retrieval_score: score,
                    rerank_score: score,
                    reason: matchReason(score, requirement),
                    risks: [],
                    selection_state: 'suggested',
                });
            });
        }
    }
    if (rows.length === 0) return;
    const { error } = await supabase.from('evidence_matches').insert(rows);
    if (error) throw error;
}

async function fetchMatches(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    requirements: JobRequirement[],
): Promise<EvidenceMatchDetails[]> {
    const { data, error } = await supabase
        .from('evidence_matches')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .order('rerank_score', { ascending: false });
    if (error) throw error;
    const matches = (data ?? []).map(row => mapMatch(row as Record<string, unknown>));
    const evidence = await evidenceRecordService.getApprovedByIds(matches.map(match => match.evidenceRecordId));
    const evidenceById = new Map(evidence.map(item => [item.record.id, item]));
    const requirementsById = new Map(requirements.map(requirement => [requirement.id, requirement]));
    return matches.flatMap(match => {
        const evidenceDetails = evidenceById.get(match.evidenceRecordId);
        if (!evidenceDetails) return [];
        return [{
            match,
            evidence: evidenceDetails,
            requirement: match.jobRequirementId ? requirementsById.get(match.jobRequirementId) : undefined,
        }];
    });
}

async function fetchOutlines(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
): Promise<OutlineCandidate[]> {
    const { data, error } = await supabase
        .from('outline_candidates')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapOutline(row as Record<string, unknown>));
}

async function fetchDrafts(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
): Promise<DraftCandidate[]> {
    const { data, error } = await supabase
        .from('draft_candidates')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapDraft(row as Record<string, unknown>));
}

async function fetchRevisions(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
): Promise<DraftRevision[]> {
    const { data, error } = await supabase
        .from('draft_revisions')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapRevision(row as Record<string, unknown>));
}

async function fetchDetails(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    session: WritingSession,
): Promise<WritingSessionDetails> {
    if (!session.jobTargetId || !session.coverLetterQuestionId) {
        throw new WritingSessionServiceError('storage', '작성 세션 연결 정보가 부족합니다.', 500);
    }
    const { target, requirements } = await fetchTargetAndRequirements(session.jobTargetId);
    const [question, evidence, matches, outlines, drafts, revisions] = await Promise.all([
        fetchQuestion(supabase, session.coverLetterQuestionId, userId),
        evidenceRecordService.listApproved({ limit: 100 }),
        fetchMatches(supabase, userId, session.id, requirements),
        fetchOutlines(supabase, userId, session.id),
        fetchDrafts(supabase, userId, session.id),
        fetchRevisions(supabase, userId, session.id),
    ]);
    return { session, target, question, requirements, evidence, matches, outlines, drafts, revisions };
}

function charLength(value: string): number {
    return Array.from(value).length;
}

function getCharLimit(question: WritingSessionQuestion): number {
    return question.charLimit ?? 700;
}

function ensureSessionEditable(session: WritingSession): void {
    if (session.state === 'finalized' || session.state === 'exported') {
        throw new WritingSessionServiceError('conflict', '최종 확정된 세션은 먼저 새 버전으로 복제해 주세요.', 409);
    }
}

async function markCandidatesStale(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
): Promise<void> {
    const [outlineResult, draftResult] = await Promise.all([
        supabase
            .from('outline_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', sessionId)
            .eq('user_id', userId)
            .in('status', ['generated', 'selected']),
        supabase
            .from('draft_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', sessionId)
            .eq('user_id', userId)
            .in('status', ['generated', 'selected', 'partially_used']),
    ]);
    if (outlineResult.error) throw outlineResult.error;
    if (draftResult.error) throw draftResult.error;
}

async function markDraftCandidatesStale(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
): Promise<void> {
    const { error } = await supabase
        .from('draft_candidates')
        .update({ status: 'stale' })
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .in('status', ['generated', 'selected', 'partially_used']);
    if (error) throw error;
}

export const writingSessionService = {
    async list(options: { limit?: unknown } = {}): Promise<WritingSession[]> {
        const parsed = sessionListSchema.safeParse(options);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '작성 세션 목록 조건을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('writing_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(parsed.data.limit);
        if (error) throw error;
        return (data ?? []).map(row => mapSession(row as Record<string, unknown>));
    },

    async get(idInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        return fetchDetails(supabase, userId, session);
    },

    async create(input: WritingSessionCreateInput): Promise<WritingSessionDetails> {
        const parsed = sessionCreateSchema.safeParse(input);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '지원 대상과 문항을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const { target, requirements } = await fetchTargetAndRequirements(parsed.data.jobTargetId);

        const { data: coverLetterData, error: coverLetterError } = await supabase
            .from('cover_letters')
            .insert({
                user_id: userId,
                job_target_id: target.id,
                title: `${target.company} - ${target.role}`,
                company: target.company,
                role: target.role,
                deadline: target.deadline ?? null,
                status: 'writing',
                version: 1,
            })
            .select('*')
            .single();
        if (coverLetterError) throw coverLetterError;
        const coverLetterId = (coverLetterData as Record<string, unknown>).id as string;

        const { data: questionData, error: questionError } = await supabase
            .from('cover_letter_questions')
            .insert({
                cover_letter_id: coverLetterId,
                user_id: userId,
                question: parsed.data.question,
                char_limit: parsed.data.charLimit,
                position: 0,
                status: 'writing',
            })
            .select('*')
            .single();
        if (questionError) {
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw questionError;
        }
        const questionId = (questionData as Record<string, unknown>).id as string;

        const { data: sessionData, error: sessionError } = await supabase
            .from('writing_sessions')
            .insert({
                user_id: userId,
                job_target_id: target.id,
                cover_letter_question_id: questionId,
                state: 'evidence_selecting',
                generation_settings: { charLimit: parsed.data.charLimit },
            })
            .select('*')
            .single();
        if (sessionError) {
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw sessionError;
        }
        const session = mapSession(sessionData as Record<string, unknown>);
        try {
            const evidence = await evidenceRecordService.listApproved({ limit: 100 });
            await insertMatches(supabase, userId, session.id, requirements, evidence);
            return fetchDetails(supabase, userId, session);
        } catch (error) {
            await supabase.from('writing_sessions').delete().eq('id', session.id).eq('user_id', userId);
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw error;
        }
    },

    async refreshMatches(idInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.jobTargetId) throw new WritingSessionServiceError('storage', '지원 대상 연결 정보가 없습니다.', 500);
        const { requirements } = await fetchTargetAndRequirements(session.jobTargetId);
        const current = await fetchMatches(supabase, userId, id, requirements);
        const existingIds = new Set(current.map(item => item.match.evidenceRecordId));
        const evidence = (await evidenceRecordService.listApproved({ limit: 100 })).filter(item => !existingIds.has(item.record.id));
        await insertMatches(supabase, userId, id, requirements, evidence);
        return fetchDetails(supabase, userId, session);
    },

    async updateEvidenceSelections(idInput: unknown, input: EvidenceSelectionInput): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const parsed = evidenceSelectionSchema.safeParse(input);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '근거 선택을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (parsed.data.selections.length > 0) {
            const { data: existing, error: existingError } = await supabase
                .from('evidence_matches')
                .select('id')
                .eq('writing_session_id', id)
                .eq('user_id', userId)
                .in('id', parsed.data.selections.map(item => item.matchId));
            if (existingError) throw existingError;
            const existingIds = new Set((existing ?? []).map(row => row.id as string));
            if (parsed.data.selections.some(item => !existingIds.has(item.matchId))) {
                throw new WritingSessionServiceError('invalid_input', '이 세션에 속하지 않은 근거입니다.', 400);
            }
            for (const selection of parsed.data.selections) {
                const { error } = await supabase
                    .from('evidence_matches')
                    .update({ selection_state: selection.selectionState, updated_at: new Date().toISOString() })
                    .eq('id', selection.matchId)
                    .eq('writing_session_id', id)
                    .eq('user_id', userId);
                if (error) throw error;
            }
            await markCandidatesStale(supabase, userId, id);
            const { error } = await supabase
                .from('writing_sessions')
                .update({ state: 'evidence_selecting', updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', userId);
            if (error) throw error;
        }
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async getGenerationContext(idInput: unknown): Promise<WritingGenerationContext> {
        const details = await this.get(idInput);
        const selectedMatches = details.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState));
        if (selectedMatches.length === 0) {
            throw new WritingSessionServiceError('analysis', '활동 근거를 하나 이상 선택한 뒤 생성해 주세요.', 422);
        }
        if (details.requirements.length === 0) {
            throw new WritingSessionServiceError('analysis', '승인된 공고 요구사항이 필요합니다.', 422);
        }
        const selectedOutline = details.outlines.find(outline => outline.status === 'selected');
        if (!selectedOutline) {
            throw new WritingSessionServiceError('analysis', '선택된 개요가 없습니다.', 422);
        }
        const selectedEvidenceIds = new Set(selectedMatches.map(item => item.match.evidenceRecordId));
        return {
            ...details,
            selectedMatches,
            selectedEvidence: details.evidence.filter(item => selectedEvidenceIds.has(item.record.id)),
            selectedOutline,
        };
    },

    async getOutlineContext(idInput: unknown): Promise<Omit<WritingGenerationContext, 'selectedOutline'>> {
        const details = await this.get(idInput);
        const selectedMatches = details.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState));
        if (selectedMatches.length === 0) {
            throw new WritingSessionServiceError('analysis', '활동 근거를 하나 이상 선택한 뒤 생성해 주세요.', 422);
        }
        if (details.requirements.length === 0) {
            throw new WritingSessionServiceError('analysis', '승인된 공고 요구사항이 필요합니다.', 422);
        }
        const selectedEvidenceIds = new Set(selectedMatches.map(item => item.match.evidenceRecordId));
        return {
            ...details,
            selectedMatches,
            selectedEvidence: details.evidence.filter(item => selectedEvidenceIds.has(item.record.id)),
        };
    },

    async replaceOutlines(idInput: unknown, candidates: Array<{
        strategy: OutlineCandidate['strategy'];
        thesis: string;
        structure: string[];
        evidenceRecordIds: string[];
        requirementIds: string[];
    }>): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        if (candidates.length !== 3) throw new WritingSessionServiceError('analysis', '개요 후보는 3개가 필요합니다.', 422);
        if (new Set(candidates.map(candidate => `${candidate.strategy}:${candidate.thesis.trim().toLowerCase()}`)).size !== 3) {
            throw new WritingSessionServiceError('analysis', '서로 다른 개요 후보가 필요합니다.', 422);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        const details = await fetchDetails(supabase, userId, session);
        const allowedEvidence = new Set(details.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState)).map(item => item.match.evidenceRecordId));
        const allowedRequirements = new Set(details.requirements.map(requirement => requirement.id));
        if (candidates.some(candidate => candidate.evidenceRecordIds.some(evidenceId => !allowedEvidence.has(evidenceId))
            || candidate.requirementIds.some(requirementId => !allowedRequirements.has(requirementId))
            || candidate.evidenceRecordIds.length === 0
            || candidate.requirementIds.length === 0)) {
            throw new WritingSessionServiceError('analysis', '개요 후보의 근거 연결을 확인할 수 없습니다.', 422);
        }

        await markCandidatesStale(supabase, userId, id);
        const { error } = await supabase.from('outline_candidates').insert(candidates.map(candidate => ({
            writing_session_id: id,
            user_id: userId,
            strategy: candidate.strategy,
            thesis: candidate.thesis,
            structure: candidate.structure,
            evidence_record_ids: candidate.evidenceRecordIds,
            requirement_ids: candidate.requirementIds,
            status: 'generated',
        })));
        if (error) throw error;
        const { error: updateError } = await supabase
            .from('writing_sessions')
            .update({ state: 'outline_selecting', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (updateError) throw updateError;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async selectOutline(idInput: unknown, outlineInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const outlineId = parseId((outlineInput as Record<string, unknown> | null)?.id, '개요 ID');
        const parsed = outlineSelectionSchema.safeParse((outlineInput as Record<string, unknown> | null)?.status === 'selected'
            ? { status: 'selected' }
            : outlineInput);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '개요 선택을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        const { data: outline, error: outlineError } = await supabase
            .from('outline_candidates')
            .select('*')
            .eq('id', outlineId)
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (outlineError) throw outlineError;
        if (!outline) throw new WritingSessionServiceError('not_found', '개요 후보를 찾을 수 없습니다.', 404);
        if ((outline as Record<string, unknown>).status === 'stale') throw new WritingSessionServiceError('conflict', '오래된 개요 후보입니다. 다시 생성해 주세요.', 409);

        const { error: resetError } = await supabase
            .from('outline_candidates')
            .update({ status: 'rejected' })
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .in('status', ['selected', 'generated']);
        if (resetError) throw resetError;
        const { error: selectError } = await supabase
            .from('outline_candidates')
            .update({ status: 'selected' })
            .eq('id', outlineId)
            .eq('writing_session_id', id)
            .eq('user_id', userId);
        if (selectError) throw selectError;
        await supabase
            .from('draft_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .in('status', ['generated', 'selected', 'partially_used']);
        const { error: updateError } = await supabase
            .from('writing_sessions')
            .update({ state: 'drafting', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (updateError) throw updateError;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async replaceDrafts(idInput: unknown, candidates: Array<{
        outlineCandidateId: string;
        content: string;
        charCount: number;
        evidenceRecordIds: string[];
        validationResult: Record<string, unknown>;
        model?: string;
        promptVersion?: string;
    }>): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        if (candidates.length !== 3) throw new WritingSessionServiceError('analysis', '초안 후보는 3개가 필요합니다.', 422);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        const details = await fetchDetails(supabase, userId, session);
        const selectedOutline = details.outlines.find(outline => outline.status === 'selected');
        if (!selectedOutline) throw new WritingSessionServiceError('analysis', '초안을 만들 개요를 먼저 선택해 주세요.', 422);
        const selectedEvidenceIds = new Set(details.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState)).map(item => item.match.evidenceRecordId));
        if (candidates.some(candidate => candidate.outlineCandidateId !== selectedOutline.id
            || candidate.evidenceRecordIds.length === 0
            || candidate.evidenceRecordIds.some(evidenceId => !selectedEvidenceIds.has(evidenceId))
            || candidate.charCount !== charLength(candidate.content))) {
            throw new WritingSessionServiceError('analysis', '초안 후보의 근거 연결을 확인할 수 없습니다.', 422);
        }
        await markDraftCandidatesStale(supabase, userId, id);
        const { error } = await supabase.from('draft_candidates').insert(candidates.map(candidate => ({
            writing_session_id: id,
            user_id: userId,
            outline_candidate_id: candidate.outlineCandidateId,
            content: candidate.content,
            char_count: candidate.charCount,
            evidence_map: { evidenceRecordIds: candidate.evidenceRecordIds },
            validation_result: candidate.validationResult,
            model: candidate.model ?? null,
            prompt_version: candidate.promptVersion ?? null,
            status: 'generated',
        })));
        if (error) throw error;
        const { error: updateError } = await supabase
            .from('writing_sessions')
            .update({ state: 'comparing', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (updateError) throw updateError;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async selectDraft(idInput: unknown, draftInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const draftId = parseId((draftInput as Record<string, unknown> | null)?.id, '초안 ID');
        const parsedInput = draftSelectionSchema.safeParse(draftInput);
        if (!parsedInput.success) throw new WritingSessionServiceError('invalid_input', '초안 선택을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        const details = await fetchDetails(supabase, userId, session);
        const draft = details.drafts.find(item => item.id === draftId);
        if (!draft) throw new WritingSessionServiceError('not_found', '초안 후보를 찾을 수 없습니다.', 404);
        if (draft.status === 'stale') throw new WritingSessionServiceError('conflict', '오래된 초안 후보입니다. 다시 생성해 주세요.', 409);
        if (draft.charCount > getCharLimit(details.question)) throw new WritingSessionServiceError('conflict', '글자 수 제한을 넘은 초안은 선택할 수 없습니다.', 409);

        const { error: resetError } = await supabase
            .from('draft_candidates')
            .update({ status: 'rejected' })
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .in('status', ['selected', 'generated']);
        if (resetError) throw resetError;
        const { error: selectError } = await supabase
            .from('draft_candidates')
            .update({ status: 'selected' })
            .eq('id', draftId)
            .eq('writing_session_id', id)
            .eq('user_id', userId);
        if (selectError) throw selectError;
        await insertRevision(supabase, userId, id, draft.content, 'ai', 'AI 후보 선택');
        const { error: updateError } = await supabase
            .from('writing_sessions')
            .update({ state: 'editing', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (updateError) throw updateError;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async updateSelectedDraft(idInput: unknown, input: DraftUpdateInput): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const parsed = draftUpdateSchema.safeParse(input);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '초안 내용을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        const details = await fetchDetails(supabase, userId, session);
        const selected = details.drafts.find(draft => draft.status === 'selected');
        if (!selected) throw new WritingSessionServiceError('conflict', '먼저 초안을 선택해 주세요.', 409);
        if (parsed.data.draftId && parsed.data.draftId !== selected.id) {
            throw new WritingSessionServiceError('conflict', '선택한 초안과 저장 대상이 다릅니다.', 409);
        }
        const nextCharCount = charLength(parsed.data.content);
        const { error } = await supabase
            .from('draft_candidates')
            .update({
                content: parsed.data.content,
                char_count: nextCharCount,
                validation_result: { charCount: nextCharCount, charLimit: getCharLimit(details.question), overLimit: nextCharCount > getCharLimit(details.question) },
            })
            .eq('id', selected.id)
            .eq('writing_session_id', id)
            .eq('user_id', userId);
        if (error) throw error;
        await insertRevision(supabase, userId, id, parsed.data.content, 'user', '사용자 직접 수정');
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async finalize(idInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        const details = await fetchDetails(supabase, userId, session);
        const selected = details.drafts.find(draft => draft.status === 'selected');
        if (!selected) throw new WritingSessionServiceError('conflict', '최종 확정할 초안을 먼저 선택해 주세요.', 409);
        if (selected.charCount > getCharLimit(details.question)) throw new WritingSessionServiceError('conflict', '글자 수 제한을 넘은 초안은 최종 확정할 수 없습니다.', 409);
        const now = new Date().toISOString();
        const { error: sessionError } = await supabase
            .from('writing_sessions')
            .update({ state: 'finalized', finalized_at: now, updated_at: now })
            .eq('id', id)
            .eq('user_id', userId);
        if (sessionError) throw sessionError;
        const { error: questionError } = await supabase
            .from('cover_letter_questions')
            .update({ final_answer: selected.content, status: 'finalized', updated_at: now })
            .eq('id', details.question.id)
            .eq('user_id', userId);
        if (questionError) throw questionError;
        return fetchDetails(supabase, userId, { ...session, state: 'finalized', finalizedAt: now, updatedAt: now });
    },
};

async function insertRevision(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    content: string,
    editor: 'user' | 'ai',
    changeReason: string,
): Promise<void> {
    const { data: previous, error: previousError } = await supabase
        .from('draft_revisions')
        .select('id')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (previousError) throw previousError;
    const { error } = await supabase.from('draft_revisions').insert({
        writing_session_id: sessionId,
        user_id: userId,
        parent_revision_id: previous?.id ?? null,
        content,
        editor,
        change_reason: changeReason,
    });
    if (error) throw error;
}

export { charLength, getCharLimit };
