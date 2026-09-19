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
    DraftFactCitationSchema,
    type DraftFactCitation,
    DraftRevisionSchema,
    type DraftCandidate,
    type DraftRevision,
} from '@/entities/draft-candidate/model';
import { DomainIdSchema } from '@/shared/types';
import type { StyleExample, StyleProfile } from '@/entities/style-profile/model';
import { styleProfileService } from '@/entities/style-profile/api';
import { z } from 'zod';

const sessionQuestionInputSchema = z.object({
    question: z.string().trim().min(1).max(5_000),
    charLimit: z.coerce.number().int().min(100).max(100_000).default(700),
});

const sessionCreateSchema = z.object({
    jobTargetId: DomainIdSchema,
    styleProfileId: DomainIdSchema.optional(),
    question: z.string().trim().min(1).max(5_000).optional(),
    charLimit: z.coerce.number().int().min(100).max(100_000).default(700),
    questions: z.array(sessionQuestionInputSchema).min(1).max(20).optional(),
}).refine(value => Boolean(value.questions?.length || value.question), {
    message: '자기소개서 문항을 하나 이상 입력해 주세요.',
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
    citations: z.array(z.object({
        sentenceIndex: z.number().int().min(0),
        sentenceText: z.string().max(10_000).optional(),
        factType: z.enum(['metric', 'date', 'named_entity', 'claim']).default('claim'),
        evidenceRecordIds: z.array(DomainIdSchema).max(50),
    })).max(100).optional(),
});

const draftSelectionSchema = z.object({
    status: z.literal('selected'),
});

export type WritingSessionCreateInput = z.input<typeof sessionCreateSchema>;
export type EvidenceSelectionInput = z.input<typeof evidenceSelectionSchema>;
export type DraftUpdateInput = z.input<typeof draftUpdateSchema>;
export type DraftCitationInput = NonNullable<z.infer<typeof draftUpdateSchema>['citations']>[number];

export type DraftMergeParagraphInput = {
    position: number;
    sourceDraftId: string;
    text: string;
};

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
    styleProfile?: StyleProfile;
    styleExamples: StyleExample[];
    questions: WritingSessionQuestion[];
    question: WritingSessionQuestion;
    requirements: JobRequirement[];
    evidence: EvidenceRecordDetails[];
    matches: EvidenceMatchDetails[];
    outlines: OutlineCandidate[];
    drafts: DraftCandidate[];
    revisions: DraftRevision[];
    factCitations: DraftFactCitation[];
    quality?: WritingQualitySummary;
};

export type WritingQualitySummary = {
    evidenceCount: number;
    selectedEvidenceCount: number;
    outlineCandidateCount: number;
    selectedOutline: boolean;
    draftCandidateCount: number;
    selectedDraftId?: string;
    revisionCount: number;
    userRevisionCount: number;
    factSentenceCount: number;
    verifiedFactSentenceCount: number;
    factCitationCoverage: number;
    charCount?: number;
    charLimit: number;
    overLimit: boolean;
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
        coverLetterId: nullableString(record.cover_letter_id),
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
        questionId: nullableString(record.question_id),
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
        questionId: nullableString(record.question_id),
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
        questionId: nullableString(record.question_id),
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
        questionId: nullableString(record.question_id),
        parentRevisionId: nullableString(record.parent_revision_id),
        content: record.content,
        editor: record.editor,
        changeReason: nullableString(record.change_reason),
        diffSummary: nullableString(record.diff_summary),
        createdAt: record.created_at,
    });
}

function mapFactCitation(record: Record<string, unknown>): DraftFactCitation {
    return DraftFactCitationSchema.parse({
        id: record.id,
        writingSessionId: record.writing_session_id,
        questionId: record.question_id,
        draftCandidateId: record.draft_candidate_id,
        userId: record.user_id,
        sentenceIndex: record.sentence_index,
        sentenceText: record.sentence_text,
        factType: record.fact_type,
        evidenceRecordIds: idArray(record.evidence_record_ids),
        status: record.status,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
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

async function fetchQuestions(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    coverLetterId: string,
    userId: string,
): Promise<WritingSessionQuestion[]> {
    const { data, error } = await supabase
        .from('cover_letter_questions')
        .select('*')
        .eq('cover_letter_id', coverLetterId)
        .eq('user_id', userId)
        .order('position', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapQuestion(row as Record<string, unknown>));
}

const KOREAN_PARTICLE_SUFFIXES = [
    '으로부터', '으로', '에서', '에게', '까지', '부터', '처럼', '하고', '하며',
    '이라', '라는', '이다', '했다', '한다', '한', '은', '는', '이', '가', '을', '를', '에', '의', '와', '과', '도', '만',
];

function normalizeSearchText(value: string): string {
    return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim();
}

function addKoreanVariants(token: string, output: Set<string>): void {
    if (!/\p{Script=Hangul}/u.test(token)) return;

    const stripped = token.replace(new RegExp(`(?:${KOREAN_PARTICLE_SUFFIXES.join('|')})$`, 'u'), '');
    if (stripped.length >= 2) output.add(stripped);

    // Korean compounds are frequently written with or without spaces. Bigrams
    // preserve useful recall without requiring an embedding provider first.
    if (token.length >= 2) {
        for (let index = 0; index <= token.length - 2; index += 1) {
            output.add(token.slice(index, index + 2));
        }
    }
}

export function tokenize(value: string): Set<string> {
    const tokens = new Set<string>();
    for (const token of normalizeSearchText(value).split(/[^\p{L}\p{N}]+/u)) {
        if (token.length < 2) continue;
        tokens.add(token);
        addKoreanVariants(token, tokens);
    }
    return tokens;
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

export function scoreEvidence(requirement: JobRequirement, evidence: EvidenceRecordDetails): number {
    const requirementTokens = tokenize(requirement.text);
    if (requirementTokens.size === 0) return 0.05;

    const { careerItem, record } = evidence;
    const highPriorityTokens = tokenize([
        careerItem.title,
        careerItem.organization,
        careerItem.role,
        ...careerItem.skills,
        ...careerItem.competencyTags,
        ...record.skills,
        ...record.competencyTags,
    ].filter(Boolean).join(' '));
    const detailTokens = tokenize([
        careerItem.summary,
        careerItem.contributionNote,
        record.situation,
        record.problem,
        record.action,
        record.result,
        record.learning,
    ].filter(Boolean).join(' '));
    if (highPriorityTokens.size === 0 && detailTokens.size === 0) return 0.05;

    const highPriorityOverlap = [...requirementTokens].filter(token => highPriorityTokens.has(token)).length;
    const detailOverlap = [...requirementTokens].filter(token => detailTokens.has(token)).length;
    const weightedOverlap = (highPriorityOverlap * 1.5 + detailOverlap * 0.75) / Math.max(requirementTokens.size, 1);
    const overlapScore = Math.min(1, weightedOverlap);
    const normalizedRequirement = normalizeSearchText(requirement.text);
    const normalizedEvidence = normalizeSearchText(evidenceSearchText(evidence));
    const phraseBoost = normalizedRequirement.length >= 4 && normalizedEvidence.includes(normalizedRequirement) ? 0.15 : 0;
    return Math.min(1, 0.1 + overlapScore * 0.8 + phraseBoost);
}

export type RankedEvidence = {
    evidence: EvidenceRecordDetails;
    score: number;
};

export function rankEvidence(
    requirement: JobRequirement,
    evidence: EvidenceRecordDetails[],
    limit = evidence.length,
): RankedEvidence[] {
    const safeLimit = Math.max(0, Math.min(Math.floor(limit), evidence.length));
    return evidence
        .map(item => ({ evidence: item, score: scoreEvidence(requirement, item) }))
        .sort((left, right) => right.score - left.score || left.evidence.record.id.localeCompare(right.evidence.record.id))
        .slice(0, safeLimit);
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
    questionId: string,
    requirements: JobRequirement[],
    evidence: EvidenceRecordDetails[],
): Promise<void> {
    if (evidence.length === 0) return;
    const rows: Array<Record<string, unknown>> = [];
    if (requirements.length === 0) {
        evidence.slice(0, 10).forEach(item => rows.push({
            writing_session_id: sessionId,
            question_id: questionId,
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
            const ranked = rankEvidence(requirement, evidence, 3);
            ranked.forEach(({ evidence: item, score }) => {
                rows.push({
                    writing_session_id: sessionId,
                    question_id: questionId,
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
    questionId: string,
    requirements: JobRequirement[],
): Promise<EvidenceMatchDetails[]> {
    const { data, error } = await supabase
        .from('evidence_matches')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
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
    questionId: string,
): Promise<OutlineCandidate[]> {
    const { data, error } = await supabase
        .from('outline_candidates')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapOutline(row as Record<string, unknown>));
}

async function fetchDrafts(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
): Promise<DraftCandidate[]> {
    const { data, error } = await supabase
        .from('draft_candidates')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapDraft(row as Record<string, unknown>));
}

async function fetchRevisions(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
): Promise<DraftRevision[]> {
    const { data, error } = await supabase
        .from('draft_revisions')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapRevision(row as Record<string, unknown>));
}

async function fetchFactCitations(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
): Promise<DraftFactCitation[]> {
    const { data, error } = await supabase
        .from('draft_fact_citations')
        .select('*')
        .eq('writing_session_id', sessionId)
        .eq('question_id', questionId)
        .eq('user_id', userId)
        .order('sentence_index', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => mapFactCitation(row as Record<string, unknown>));
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
    const questions = session.coverLetterId
        ? await fetchQuestions(supabase, session.coverLetterId, userId)
        : [await fetchQuestion(supabase, session.coverLetterQuestionId, userId)];
    const question = questions.find(item => item.id === session.coverLetterQuestionId) ?? questions[0];
    if (!question) throw new WritingSessionServiceError('storage', '작성 문항이 없습니다.', 500);
    const styleDetails = session.styleProfileId
        ? await styleProfileService.getForGeneration(session.styleProfileId, { questionId: question.id })
        : null;
    const [evidence, matches, outlines, drafts, revisions, factCitations] = await Promise.all([
        evidenceRecordService.listApproved({ limit: 100 }),
        fetchMatches(supabase, userId, session.id, question.id, requirements),
        fetchOutlines(supabase, userId, session.id, question.id),
        fetchDrafts(supabase, userId, session.id, question.id),
        fetchRevisions(supabase, userId, session.id, question.id),
        fetchFactCitations(supabase, userId, session.id, question.id),
    ]);
    const details: Omit<WritingSessionDetails, 'quality'> = {
        session,
        target,
        styleProfile: styleDetails?.profile,
        styleExamples: styleDetails?.examples ?? [],
        questions,
        question,
        requirements,
        evidence,
        matches,
        outlines,
        drafts,
        revisions,
        factCitations,
    };
    return { ...details, quality: buildWritingQualitySummary(details) };
}

function charLength(value: string): number {
    return Array.from(value).length;
}

function splitSentences(value: string): string[] {
    return (value.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [])
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

function splitParagraphs(value: string): string[] {
    return value.split(/\n\s*\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
}

function isFactLikeSentence(sentence: string): boolean {
    return /(?:\d|%|퍼센트|명|건|회|개월|주|일|원|년|월|회사|프로젝트|서비스|개발|개선|운영|구축|담당|달성|감소|증가|[A-Z]{2,})/u.test(sentence);
}

export function buildWritingQualitySummary(details: Pick<WritingSessionDetails, 'evidence' | 'matches' | 'outlines' | 'drafts' | 'revisions' | 'factCitations' | 'question'>): WritingQualitySummary {
    const selectedEvidenceIds = new Set(details.matches
        .filter(item => ['selected', 'locked'].includes(item.match.selectionState))
        .map(item => item.match.evidenceRecordId));
    const activeOutlines = details.outlines.filter(outline => outline.status !== 'stale');
    const activeDrafts = details.drafts.filter(draft => draft.status !== 'stale');
    const selectedDraft = activeDrafts.find(draft => draft.status === 'selected');
    const factSentences = selectedDraft ? splitSentences(selectedDraft.content).filter(isFactLikeSentence) : [];
    const verifiedFactSentenceIds = new Set(details.factCitations
        .filter(citation => citation.draftCandidateId === selectedDraft?.id && citation.status === 'verified' && citation.evidenceRecordIds.length > 0)
        .map(citation => citation.sentenceIndex));
    const factCitationCoverage = factSentences.length === 0
        ? (selectedDraft ? 1 : 0)
        : Math.min(1, verifiedFactSentenceIds.size / factSentences.length);
    const charCount = selectedDraft?.charCount;
    const charLimit = details.question.charLimit ?? 700;
    return {
        evidenceCount: details.evidence.length,
        selectedEvidenceCount: selectedEvidenceIds.size,
        outlineCandidateCount: activeOutlines.length,
        selectedOutline: activeOutlines.some(outline => outline.status === 'selected'),
        draftCandidateCount: activeDrafts.length,
        selectedDraftId: selectedDraft?.id,
        revisionCount: details.revisions.length,
        userRevisionCount: details.revisions.filter(revision => revision.editor === 'user').length,
        factSentenceCount: factSentences.length,
        verifiedFactSentenceCount: Math.min(factSentences.length, verifiedFactSentenceIds.size),
        factCitationCoverage,
        charCount,
        charLimit,
        overLimit: typeof charCount === 'number' && charCount > charLimit,
    };
}

export type NormalizedDraftCitation = {
    sentenceIndex: number;
    sentenceText: string;
    factType: 'metric' | 'date' | 'named_entity' | 'claim';
    evidenceRecordIds: string[];
    status: 'verified' | 'unverified';
};

function normalizeDraftCitations(
    content: string,
    citations: DraftCitationInput[] | undefined,
    allowedEvidenceIds: Set<string>,
): { citations: NormalizedDraftCitation[]; unverifiedFactIndexes: number[]; sentences: string[] } {
    const sentences = splitSentences(content);
    const byIndex = new Map<number, DraftCitationInput>();
    for (const citation of citations ?? []) {
        if (citation.sentenceIndex >= sentences.length) {
            throw new WritingSessionServiceError('invalid_input', '근거를 연결할 문장을 찾을 수 없습니다.', 400);
        }
        if (byIndex.has(citation.sentenceIndex)) {
            throw new WritingSessionServiceError('invalid_input', '한 문장에 근거 연결을 중복할 수 없습니다.', 400);
        }
        const evidenceRecordIds = [...new Set(citation.evidenceRecordIds)];
        if (evidenceRecordIds.some(id => !allowedEvidenceIds.has(id))) {
            throw new WritingSessionServiceError('invalid_input', '선택하지 않은 활동을 사실 근거로 연결할 수 없습니다.', 400);
        }
        const sentenceText = sentences[citation.sentenceIndex];
        if (citation.sentenceText?.trim() && citation.sentenceText.trim() !== sentenceText) {
            throw new WritingSessionServiceError('invalid_input', '근거를 연결한 문장 내용이 최신 초안과 다릅니다.', 400);
        }
        byIndex.set(citation.sentenceIndex, citation);
    }
    const unverifiedFactIndexes = sentences
        .map((sentence, index) => isFactLikeSentence(sentence) && !(byIndex.get(index)?.evidenceRecordIds.length) ? index : -1)
        .filter(index => index >= 0);
    const normalized = [...byIndex.entries()].map(([sentenceIndex, citation]) => ({
        sentenceIndex,
        sentenceText: sentences[sentenceIndex],
        factType: citation.factType,
        evidenceRecordIds: [...new Set(citation.evidenceRecordIds)],
        status: citation.evidenceRecordIds.length > 0 ? 'verified' as const : 'unverified' as const,
    }));
    return { citations: normalized, unverifiedFactIndexes, sentences };
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
    questionId: string,
): Promise<void> {
    const [outlineResult, draftResult] = await Promise.all([
        supabase
            .from('outline_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', sessionId)
            .eq('user_id', userId)
            .eq('question_id', questionId)
            .in('status', ['generated', 'selected']),
        supabase
            .from('draft_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', sessionId)
            .eq('user_id', userId)
            .eq('question_id', questionId)
            .in('status', ['generated', 'selected', 'partially_used']),
    ]);
    if (outlineResult.error) throw outlineResult.error;
    if (draftResult.error) throw draftResult.error;
}

async function markDraftCandidatesStale(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
): Promise<void> {
    const { error } = await supabase
        .from('draft_candidates')
        .update({ status: 'stale' })
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
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
        if (parsed.data.styleProfileId) await styleProfileService.getForGeneration(parsed.data.styleProfileId);
        const questions = parsed.data.questions ?? [{ question: parsed.data.question!, charLimit: parsed.data.charLimit }];

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
            .insert(questions.map((item, index) => ({
                cover_letter_id: coverLetterId,
                user_id: userId,
                question: item.question,
                char_limit: item.charLimit,
                position: index,
                status: 'writing',
            })))
            .select('*');
        if (questionError) {
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw questionError;
        }
        const questionId = (questionData?.[0] as Record<string, unknown> | undefined)?.id as string | undefined;
        if (!questionId) {
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw new WritingSessionServiceError('storage', '작성 문항을 만들지 못했습니다.', 500);
        }

        const { data: sessionData, error: sessionError } = await supabase
            .from('writing_sessions')
            .insert({
                user_id: userId,
                job_target_id: target.id,
                style_profile_id: parsed.data.styleProfileId ?? null,
                cover_letter_id: coverLetterId,
                cover_letter_question_id: questionId,
                state: 'evidence_selecting',
                generation_settings: { charLimit: questions[0].charLimit, questionCount: questions.length },
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
            await insertMatches(supabase, userId, session.id, questionId, requirements, evidence);
            return fetchDetails(supabase, userId, session);
        } catch (error) {
            await supabase.from('writing_sessions').delete().eq('id', session.id).eq('user_id', userId);
            await supabase.from('cover_letters').delete().eq('id', coverLetterId).eq('user_id', userId);
            throw error;
        }
    },

    async switchQuestion(idInput: unknown, questionIdInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const questionId = parseId(questionIdInput, '문항 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.coverLetterId) throw new WritingSessionServiceError('storage', '문항 묶음 연결 정보가 없습니다.', 500);
        const question = await fetchQuestion(supabase, questionId, userId);
        if (question.coverLetterId !== session.coverLetterId) {
            throw new WritingSessionServiceError('invalid_input', '이 작성 세션에 속한 문항이 아닙니다.', 400);
        }
        const { requirements } = await fetchTargetAndRequirements(session.jobTargetId!);
        const { data: existingMatches, error: matchError } = await supabase
            .from('evidence_matches')
            .select('id')
            .eq('writing_session_id', id)
            .eq('question_id', questionId)
            .eq('user_id', userId)
            .limit(1);
        if (matchError) throw matchError;
        if (!existingMatches?.length) {
            const evidence = await evidenceRecordService.listApproved({ limit: 100 });
            await insertMatches(supabase, userId, id, questionId, requirements, evidence);
        }
        const { error } = await supabase
            .from('writing_sessions')
            .update({ cover_letter_question_id: questionId, state: 'evidence_selecting', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async refreshMatches(idInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.jobTargetId) throw new WritingSessionServiceError('storage', '지원 대상 연결 정보가 없습니다.', 500);
        const { requirements } = await fetchTargetAndRequirements(session.jobTargetId);
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
        const current = await fetchMatches(supabase, userId, id, session.coverLetterQuestionId, requirements);
        const existingIds = new Set(current.map(item => item.match.evidenceRecordId));
        const evidence = (await evidenceRecordService.listApproved({ limit: 100 })).filter(item => !existingIds.has(item.record.id));
        await insertMatches(supabase, userId, id, session.coverLetterQuestionId, requirements, evidence);
        return fetchDetails(supabase, userId, session);
    },

    async updateEvidenceSelections(idInput: unknown, input: EvidenceSelectionInput): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const parsed = evidenceSelectionSchema.safeParse(input);
        if (!parsed.success) throw new WritingSessionServiceError('invalid_input', '근거 선택을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
        if (parsed.data.selections.length > 0) {
            const { data: existing, error: existingError } = await supabase
                .from('evidence_matches')
                .select('id')
                .eq('writing_session_id', id)
                .eq('user_id', userId)
                .eq('question_id', session.coverLetterQuestionId)
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
                    .eq('user_id', userId)
                    .eq('question_id', session.coverLetterQuestionId);
                if (error) throw error;
            }
            await markCandidatesStale(supabase, userId, id, session.coverLetterQuestionId);
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
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
        const details = await fetchDetails(supabase, userId, session);
        const allowedEvidence = new Set(details.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState)).map(item => item.match.evidenceRecordId));
        const allowedRequirements = new Set(details.requirements.map(requirement => requirement.id));
        if (candidates.some(candidate => candidate.evidenceRecordIds.some(evidenceId => !allowedEvidence.has(evidenceId))
            || candidate.requirementIds.some(requirementId => !allowedRequirements.has(requirementId))
            || candidate.evidenceRecordIds.length === 0
            || candidate.requirementIds.length === 0)) {
            throw new WritingSessionServiceError('analysis', '개요 후보의 근거 연결을 확인할 수 없습니다.', 422);
        }

        await markCandidatesStale(supabase, userId, id, session.coverLetterQuestionId);
        const { error } = await supabase.from('outline_candidates').insert(candidates.map(candidate => ({
            writing_session_id: id,
            user_id: userId,
            question_id: session.coverLetterQuestionId,
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
        ensureSessionEditable(session);
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
        const { data: outline, error: outlineError } = await supabase
            .from('outline_candidates')
            .select('*')
            .eq('id', outlineId)
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', session.coverLetterQuestionId)
            .maybeSingle();
        if (outlineError) throw outlineError;
        if (!outline) throw new WritingSessionServiceError('not_found', '개요 후보를 찾을 수 없습니다.', 404);
        if ((outline as Record<string, unknown>).status === 'stale') throw new WritingSessionServiceError('conflict', '오래된 개요 후보입니다. 다시 생성해 주세요.', 409);

        const { error: resetError } = await supabase
            .from('outline_candidates')
            .update({ status: 'rejected' })
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', session.coverLetterQuestionId)
            .in('status', ['selected', 'generated']);
        if (resetError) throw resetError;
        const { error: selectError } = await supabase
            .from('outline_candidates')
            .update({ status: 'selected' })
            .eq('id', outlineId)
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', session.coverLetterQuestionId);
        if (selectError) throw selectError;
        await supabase
            .from('draft_candidates')
            .update({ status: 'stale' })
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', session.coverLetterQuestionId)
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
        citations?: DraftCitationInput[];
        validationResult: Record<string, unknown>;
        model?: string;
        promptVersion?: string;
    }>): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        if (candidates.length !== 3) throw new WritingSessionServiceError('analysis', '초안 후보는 3개가 필요합니다.', 422);
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
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
        const normalizedCitations = candidates.map(candidate => normalizeDraftCitations(candidate.content, candidate.citations, selectedEvidenceIds));
        if (normalizedCitations.some(result => result.unverifiedFactIndexes.length > 0)) {
            throw new WritingSessionServiceError('analysis', '초안의 사실 문장에 활동 근거가 연결되지 않았습니다.', 422);
        }
        await markDraftCandidatesStale(supabase, userId, id, session.coverLetterQuestionId);
        const { data: insertedDrafts, error } = await supabase.from('draft_candidates').insert(candidates.map((candidate, index) => ({
            writing_session_id: id,
            user_id: userId,
            question_id: session.coverLetterQuestionId,
            outline_candidate_id: candidate.outlineCandidateId,
            content: candidate.content,
            char_count: candidate.charCount,
            evidence_map: { evidenceRecordIds: candidate.evidenceRecordIds, citations: normalizedCitations[index].citations },
            validation_result: { ...candidate.validationResult, unverifiedFactCount: 0, citationsVerified: true },
            model: candidate.model ?? null,
            prompt_version: candidate.promptVersion ?? null,
            status: 'generated',
        }))).select('id');
        if (error) throw error;
        for (const [index, row] of (insertedDrafts ?? []).entries()) {
            await replaceFactCitations(supabase, userId, id, session.coverLetterQuestionId, row.id as string, normalizedCitations[index].citations);
        }
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
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
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
            .eq('question_id', session.coverLetterQuestionId)
            .in('status', ['selected', 'generated']);
        if (resetError) throw resetError;
        const { error: selectError } = await supabase
            .from('draft_candidates')
            .update({ status: 'selected' })
            .eq('id', draftId)
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', session.coverLetterQuestionId);
        if (selectError) throw selectError;
        await insertRevision(supabase, userId, id, session.coverLetterQuestionId, draft.content, 'ai', 'AI 후보 선택');
        const { error: updateError } = await supabase
            .from('writing_sessions')
            .update({ state: 'editing', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (updateError) throw updateError;
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async mergeDrafts(idInput: unknown, paragraphsInput: DraftMergeParagraphInput[]): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        if (!Array.isArray(paragraphsInput) || paragraphsInput.length === 0 || paragraphsInput.length > 100) {
            throw new WritingSessionServiceError('invalid_input', '병합할 문단을 하나 이상 선택해 주세요.', 400);
        }
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        if (!session.coverLetterQuestionId) throw new WritingSessionServiceError('storage', '활성 문항이 없습니다.', 500);
        const details = await fetchDetails(supabase, userId, session);
        const draftsById = new Map(details.drafts.filter(draft => draft.status !== 'stale').map(draft => [draft.id, draft]));
        const positions = new Set<number>();
        const ordered = [...paragraphsInput].sort((left, right) => left.position - right.position);
        for (const paragraph of ordered) {
            if (!Number.isInteger(paragraph.position) || paragraph.position < 0 || positions.has(paragraph.position)) {
                throw new WritingSessionServiceError('invalid_input', '문단 순서를 확인해 주세요.', 400);
            }
            positions.add(paragraph.position);
            const sourceDraft = draftsById.get(parseId(paragraph.sourceDraftId, '원본 초안 ID'));
            if (!sourceDraft) throw new WritingSessionServiceError('not_found', '병합할 초안 후보를 찾을 수 없습니다.', 404);
            const sourceParagraph = splitParagraphs(sourceDraft.content)[paragraph.position];
            if (!sourceParagraph || sourceParagraph !== paragraph.text.trim()) {
                throw new WritingSessionServiceError('conflict', '원본 초안의 문단이 변경되어 다시 선택해 주세요.', 409);
            }
        }
        const content = ordered.map(item => item.text.trim()).join('\n\n');
        const evidenceRecordIds = [...new Set(ordered.flatMap(item => draftsById.get(item.sourceDraftId)?.evidenceMap.evidenceRecordIds ?? []))]
            .filter((value): value is string => typeof value === 'string');
        const normalized = normalizeDraftCitations(content, [], new Set(evidenceRecordIds));
        const selectedOutline = details.outlines.find(outline => outline.status === 'selected');
        const { data: draftData, error: draftError } = await supabase
            .from('draft_candidates')
            .insert({
                writing_session_id: id,
                question_id: session.coverLetterQuestionId,
                user_id: userId,
                outline_candidate_id: selectedOutline?.id ?? null,
                content,
                char_count: charLength(content),
                evidence_map: { evidenceRecordIds, citations: normalized.citations, mergedFromDraftIds: ordered.map(item => item.sourceDraftId) },
                validation_result: {
                    charCount: charLength(content),
                    charLimit: getCharLimit(details.question),
                    overLimit: charLength(content) > getCharLimit(details.question),
                    unverifiedFactCount: normalized.unverifiedFactIndexes.length,
                    citationsVerified: normalized.unverifiedFactIndexes.length === 0,
                },
                status: 'selected',
            })
            .select('*')
            .single();
        if (draftError) throw draftError;
        await supabase
            .from('draft_candidates')
            .update({ status: 'partially_used' })
            .eq('writing_session_id', id)
            .eq('question_id', session.coverLetterQuestionId)
            .eq('user_id', userId)
            .in('id', ordered.map(item => item.sourceDraftId))
            .neq('id', (draftData as Record<string, unknown>).id as string);
        await replaceFactCitations(supabase, userId, id, session.coverLetterQuestionId, (draftData as Record<string, unknown>).id as string, normalized.citations);
        await insertRevision(supabase, userId, id, session.coverLetterQuestionId, content, 'user', '문단 단위 초안 병합');
        const { error: sessionError } = await supabase
            .from('writing_sessions')
            .update({ state: 'editing', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (sessionError) throw sessionError;
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
        const allowedEvidenceIds = new Set(details.matches
            .filter(item => ['selected', 'locked'].includes(item.match.selectionState))
            .map(item => item.match.evidenceRecordId));
        const existingCitations = Array.isArray(selected.evidenceMap.citations)
            ? selected.evidenceMap.citations.filter((item): item is DraftCitationInput => Boolean(item && typeof item === 'object'))
                .map(item => ({
                    sentenceIndex: typeof item.sentenceIndex === 'number' ? item.sentenceIndex : 0,
                    sentenceText: typeof item.sentenceText === 'string' ? item.sentenceText : undefined,
                    factType: item.factType === 'metric' || item.factType === 'date' || item.factType === 'named_entity' ? item.factType : 'claim' as const,
                    evidenceRecordIds: Array.isArray(item.evidenceRecordIds) ? item.evidenceRecordIds.filter((value): value is string => typeof value === 'string') : [],
                }))
            : undefined;
        const normalizedCitations = normalizeDraftCitations(
            parsed.data.content,
            parsed.data.citations ?? (parsed.data.content === selected.content ? existingCitations : undefined),
            allowedEvidenceIds,
        );
        const nextCharCount = charLength(parsed.data.content);
        const { error } = await supabase
            .from('draft_candidates')
            .update({
                content: parsed.data.content,
                char_count: nextCharCount,
                evidence_map: { ...selected.evidenceMap, citations: normalizedCitations.citations },
                validation_result: {
                    charCount: nextCharCount,
                    charLimit: getCharLimit(details.question),
                    overLimit: nextCharCount > getCharLimit(details.question),
                    unverifiedFactCount: normalizedCitations.unverifiedFactIndexes.length,
                    citationsVerified: normalizedCitations.unverifiedFactIndexes.length === 0,
                },
            })
            .eq('id', selected.id)
            .eq('writing_session_id', id)
            .eq('user_id', userId)
            .eq('question_id', details.question.id);
        if (error) throw error;
        await replaceFactCitations(supabase, userId, id, details.question.id, selected.id, normalizedCitations.citations);
        await insertRevision(supabase, userId, id, details.question.id, parsed.data.content, 'user', '사용자 직접 수정');
        return fetchDetails(supabase, userId, await fetchSession(supabase, id, userId));
    },

    async finalize(idInput: unknown): Promise<WritingSessionDetails> {
        const id = parseId(idInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const session = await fetchSession(supabase, id, userId);
        ensureSessionEditable(session);
        const details = await fetchDetails(supabase, userId, session);
        const selected = details.drafts.find(draft => draft.status === 'selected');
        if (!selected) throw new WritingSessionServiceError('conflict', '최종 확정할 초안을 먼저 선택해 주세요.', 409);
        if (selected.charCount > getCharLimit(details.question)) throw new WritingSessionServiceError('conflict', '글자 수 제한을 넘은 초안은 최종 확정할 수 없습니다.', 409);
        const allowedEvidenceIds = new Set(details.matches
            .filter(item => ['selected', 'locked'].includes(item.match.selectionState))
            .map(item => item.match.evidenceRecordId));
        const savedCitations = Array.isArray(selected.evidenceMap.citations)
            ? selected.evidenceMap.citations.filter((item): item is DraftCitationInput => Boolean(item && typeof item === 'object'))
                .map(item => ({
                    sentenceIndex: typeof item.sentenceIndex === 'number' ? item.sentenceIndex : 0,
                    sentenceText: typeof item.sentenceText === 'string' ? item.sentenceText : undefined,
                    factType: item.factType === 'metric' || item.factType === 'date' || item.factType === 'named_entity' ? item.factType : 'claim' as const,
                    evidenceRecordIds: Array.isArray(item.evidenceRecordIds) ? item.evidenceRecordIds.filter((value): value is string => typeof value === 'string') : [],
                }))
            : undefined;
        const citationValidation = normalizeDraftCitations(selected.content, savedCitations, allowedEvidenceIds);
        const unverifiedFactCount = citationValidation.unverifiedFactIndexes.length;
        if (unverifiedFactCount > 0) {
            throw new WritingSessionServiceError('conflict', '사실 문장에 활동 근거를 연결한 뒤 최종 확정해 주세요.', 409);
        }
        const now = new Date().toISOString();
        const hasUnfinishedQuestion = details.questions.some(question => question.id !== details.question.id && question.status !== 'finalized');
        const { error: sessionError } = await supabase
            .from('writing_sessions')
            .update({ state: hasUnfinishedQuestion ? 'editing' : 'finalized', finalized_at: hasUnfinishedQuestion ? null : now, updated_at: now })
            .eq('id', id)
            .eq('user_id', userId);
        if (sessionError) throw sessionError;
        const { error: questionError } = await supabase
            .from('cover_letter_questions')
            .update({ final_answer: selected.content, status: 'finalized', updated_at: now })
            .eq('id', details.question.id)
            .eq('user_id', userId);
        if (questionError) throw questionError;
        return fetchDetails(supabase, userId, {
            ...session,
            state: hasUnfinishedQuestion ? 'editing' : 'finalized',
            finalizedAt: hasUnfinishedQuestion ? undefined : now,
            updatedAt: now,
        });
    },
};

async function insertRevision(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
    content: string,
    editor: 'user' | 'ai',
    changeReason: string,
): Promise<void> {
    const { data: previous, error: previousError } = await supabase
        .from('draft_revisions')
        .select('id')
        .eq('writing_session_id', sessionId)
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (previousError) throw previousError;
    const { error } = await supabase.from('draft_revisions').insert({
        writing_session_id: sessionId,
        question_id: questionId,
        user_id: userId,
        parent_revision_id: previous?.id ?? null,
        content,
        editor,
        change_reason: changeReason,
    });
    if (error) throw error;
}

async function replaceFactCitations(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    userId: string,
    sessionId: string,
    questionId: string,
    draftId: string,
    citations: NormalizedDraftCitation[],
): Promise<void> {
    const { error: deleteError } = await supabase
        .from('draft_fact_citations')
        .delete()
        .eq('draft_candidate_id', draftId)
        .eq('writing_session_id', sessionId)
        .eq('question_id', questionId)
        .eq('user_id', userId);
    if (deleteError) throw deleteError;
    if (citations.length === 0) return;
    const { error } = await supabase.from('draft_fact_citations').insert(citations.map(citation => ({
        writing_session_id: sessionId,
        question_id: questionId,
        draft_candidate_id: draftId,
        user_id: userId,
        sentence_index: citation.sentenceIndex,
        sentence_text: citation.sentenceText,
        fact_type: citation.factType,
        evidence_record_ids: citation.evidenceRecordIds,
        status: citation.status,
    })));
    if (error) throw error;
}

export { charLength, getCharLimit, splitSentences, splitParagraphs, isFactLikeSentence };
