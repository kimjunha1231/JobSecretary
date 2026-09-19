import { createHash, randomInt } from 'node:crypto';
import { createServerSupabaseClient } from '@/shared/api/server';
import { writingSessionService, isFactLikeSentence, splitSentences } from '@/entities/writing-session/api';
import { DomainIdSchema } from '@/shared/types';
import {
    EvaluationMetricsSchema,
    EvaluationVariantSchema,
    BlindComparisonSideSchema,
    StyleEvaluationCaseSchema,
    StyleEvaluationPreferenceSchema,
    StyleEvaluationRunSchema,
    type EvaluationMetrics,
    type StyleEvaluationCase,
    type StyleEvaluationPreference,
    type StyleEvaluationRun,
} from '../model';
import { z } from 'zod';

const runInputSchema = z.object({
    variant: EvaluationVariantSchema,
    draftId: DomainIdSchema.optional(),
});

const blindStartInputSchema = z.object({
    draftId: DomainIdSchema,
});

const blindSubmitInputSchema = z.object({
    preferenceId: DomainIdSchema,
    selectedSide: BlindComparisonSideSchema,
});

export type StyleEvaluationRunInput = z.input<typeof runInputSchema>;

export class StyleEvaluationServiceError extends Error {
    constructor(
        public readonly code: 'unauthorized' | 'invalid_input' | 'not_found' | 'conflict' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 409 | 500,
    ) {
        super(message);
        this.name = 'StyleEvaluationServiceError';
    }
}

function parseId(value: unknown, label: string): string {
    const parsed = DomainIdSchema.safeParse(value);
    if (!parsed.success) throw new StyleEvaluationServiceError('invalid_input', `${label}를 확인해 주세요.`, 400);
    return parsed.data;
}

function getUserIdOrThrow(user: { id: string } | null): string {
    if (!user) throw new StyleEvaluationServiceError('unauthorized', '로그인이 필요합니다.', 401);
    return user.id;
}

async function getAuthenticatedClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, userId: getUserIdOrThrow(user) };
}

function answerHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

function countOccurrences(content: string, expression: string): number {
    const source = content.toLocaleLowerCase('ko-KR');
    const target = expression.trim().toLocaleLowerCase('ko-KR');
    if (!target) return 0;
    let count = 0;
    let fromIndex = 0;
    while (fromIndex <= source.length - target.length) {
        const index = source.indexOf(target, fromIndex);
        if (index < 0) break;
        count += 1;
        fromIndex = index + target.length;
    }
    return count;
}

export function evaluateAnswer(
    content: string,
    options: {
        charLimit: number;
        bannedExpressions?: string[];
        factCitationSentenceIndexes?: number[];
        userRevisionRatio?: number;
    },
): EvaluationMetrics {
    const sentences = splitSentences(content);
    const factSentenceIndexes = sentences.map((sentence, index) => isFactLikeSentence(sentence) ? index : -1).filter(index => index >= 0);
    const verifiedIndexes = new Set(options.factCitationSentenceIndexes ?? []);
    const bannedExpressionCount = (options.bannedExpressions ?? []).reduce((total, expression) => total + countOccurrences(content, expression), 0);
    const factCitationCoverage = factSentenceIndexes.length === 0
        ? 1
        : Math.min(1, factSentenceIndexes.filter(index => verifiedIndexes.has(index)).length / factSentenceIndexes.length);
    const charCount = Array.from(content).length;
    const overLimit = charCount > options.charLimit;
    const userRevisionRatio = Math.min(1, Math.max(0, options.userRevisionRatio ?? 0));
    const score = Math.round(Math.max(0, Math.min(100,
        100
        - (overLimit ? 35 : 0)
        - Math.min(30, bannedExpressionCount * 10)
        + factCitationCoverage * 20
        - userRevisionRatio * 10,
    )) * 10) / 10;
    return EvaluationMetricsSchema.parse({
        charCount,
        charLimit: options.charLimit,
        overLimit,
        bannedExpressionCount,
        factSentenceCount: factSentenceIndexes.length,
        verifiedFactSentenceCount: Math.min(factSentenceIndexes.length, factSentenceIndexes.filter(index => verifiedIndexes.has(index)).length),
        factCitationCoverage,
        userRevisionRatio,
        score,
    });
}

function mapCase(record: Record<string, unknown>): StyleEvaluationCase {
    return StyleEvaluationCaseSchema.parse({
        id: record.id,
        userId: record.user_id,
        writingSessionId: record.writing_session_id,
        questionId: record.question_id,
        styleProfileId: typeof record.style_profile_id === 'string' ? record.style_profile_id : undefined,
        label: record.label,
        answerHash: record.answer_hash,
        status: record.status,
        metrics: record.metrics,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    });
}

function mapRun(record: Record<string, unknown>): StyleEvaluationRun {
    return StyleEvaluationRunSchema.parse({
        id: record.id,
        userId: record.user_id,
        caseId: record.case_id,
        variant: record.variant,
        sourceDraftId: typeof record.source_draft_id === 'string' ? record.source_draft_id : undefined,
        answerHash: record.answer_hash,
        metrics: record.metrics,
        createdAt: record.created_at,
    });
}

function mapPreference(record: Record<string, unknown>): StyleEvaluationPreference {
    return StyleEvaluationPreferenceSchema.parse({
        id: record.id,
        userId: record.user_id,
        caseId: record.case_id,
        leftVariant: record.left_variant,
        rightVariant: record.right_variant,
        leftAnswerHash: record.left_answer_hash,
        rightAnswerHash: record.right_answer_hash,
        selectedSide: record.selected_side ?? undefined,
        selectedVariant: record.selected_variant ?? undefined,
        createdAt: record.created_at,
        respondedAt: record.responded_at ?? undefined,
    });
}

export const styleEvaluationService = {
    async listCases(sessionIdInput: unknown): Promise<StyleEvaluationCase[]> {
        const sessionId = parseId(sessionIdInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('style_evaluation_cases')
            .select('*')
            .eq('writing_session_id', sessionId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(row => mapCase(row as Record<string, unknown>));
    },

    async createCase(sessionIdInput: unknown): Promise<StyleEvaluationCase> {
        const sessionId = parseId(sessionIdInput, '작성 세션 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const details = await writingSessionService.get(sessionId);
        const answer = details.question.finalAnswer?.trim();
        if (details.question.status !== 'finalized' || !answer) {
            throw new StyleEvaluationServiceError('conflict', '최종 확정된 문항만 평가 사례로 저장할 수 있습니다.', 409);
        }
        const factCitationSentenceIndexes = details.factCitations
            .filter(citation => citation.status === 'verified' && citation.evidenceRecordIds.length > 0)
            .map(citation => citation.sentenceIndex);
        const metrics = evaluateAnswer(answer, {
            charLimit: details.question.charLimit ?? 700,
            bannedExpressions: details.styleProfile?.bannedExpressions,
            factCitationSentenceIndexes,
            userRevisionRatio: details.quality && details.quality.revisionCount > 0
                ? details.quality.userRevisionCount / details.quality.revisionCount
                : 0,
        });
        const hash = answerHash(answer);
        const { data: existing, error: existingError } = await supabase
            .from('style_evaluation_cases')
            .select('*')
            .eq('writing_session_id', sessionId)
            .eq('question_id', details.question.id)
            .eq('answer_hash', hash)
            .eq('user_id', userId)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing) return mapCase(existing as Record<string, unknown>);
        const { data, error } = await supabase
            .from('style_evaluation_cases')
            .insert({
                user_id: userId,
                writing_session_id: sessionId,
                question_id: details.question.id,
                style_profile_id: details.styleProfile?.id ?? null,
                label: `${details.target.company} · ${details.question.question}`.slice(0, 200),
                answer_hash: hash,
                status: 'active',
                metrics,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapCase(data as Record<string, unknown>);
    },

    async listRuns(caseIdInput: unknown): Promise<StyleEvaluationRun[]> {
        const caseId = parseId(caseIdInput, '평가 사례 ID');
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('style_evaluation_runs')
            .select('*')
            .eq('case_id', caseId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map(row => mapRun(row as Record<string, unknown>));
    },

    async run(caseIdInput: unknown, input: StyleEvaluationRunInput): Promise<StyleEvaluationRun> {
        const caseId = parseId(caseIdInput, '평가 사례 ID');
        const parsed = runInputSchema.safeParse(input);
        if (!parsed.success) throw new StyleEvaluationServiceError('invalid_input', '평가 실행 조건을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data: caseRecord, error: caseError } = await supabase
            .from('style_evaluation_cases')
            .select('*')
            .eq('id', caseId)
            .eq('user_id', userId)
            .maybeSingle();
        if (caseError) throw caseError;
        if (!caseRecord) throw new StyleEvaluationServiceError('not_found', '평가 사례를 찾을 수 없습니다.', 404);
        const evaluationCase = mapCase(caseRecord as Record<string, unknown>);
        const details = await writingSessionService.get(evaluationCase.writingSessionId);
        let content: string | undefined;
        let sourceDraftId: string | undefined;
        if (parsed.data.variant === 'studio') {
            if (details.question.id !== evaluationCase.questionId || details.question.status !== 'finalized' || !details.question.finalAnswer?.trim()) {
                throw new StyleEvaluationServiceError('conflict', '평가 사례의 최종 답변이 현재 문항과 다릅니다.', 409);
            }
            content = details.question.finalAnswer.trim();
        } else {
            if (!parsed.data.draftId) throw new StyleEvaluationServiceError('invalid_input', '비교할 초안 ID가 필요합니다.', 400);
            const draft = details.drafts.find(item => item.id === parsed.data.draftId && item.status !== 'stale');
            if (!draft) throw new StyleEvaluationServiceError('not_found', '비교할 초안 후보를 찾을 수 없습니다.', 404);
            content = draft.content;
            sourceDraftId = draft.id;
        }
        const factCitationSentenceIndexes = details.factCitations
            .filter(citation => citation.draftCandidateId === sourceDraftId && citation.status === 'verified' && citation.evidenceRecordIds.length > 0)
            .map(citation => citation.sentenceIndex);
        const metrics = evaluateAnswer(content, {
            charLimit: details.question.charLimit ?? evaluationCase.metrics.charLimit,
            bannedExpressions: details.styleProfile?.bannedExpressions,
            factCitationSentenceIndexes: parsed.data.variant === 'studio'
                ? details.factCitations.filter(citation => citation.status === 'verified' && citation.evidenceRecordIds.length > 0).map(citation => citation.sentenceIndex)
                : factCitationSentenceIndexes,
            userRevisionRatio: details.quality && details.quality.revisionCount > 0
                ? details.quality.userRevisionCount / details.quality.revisionCount
                : 0,
        });
        const hash = answerHash(content);
        const { data: existing, error: existingError } = await supabase
            .from('style_evaluation_runs')
            .select('*')
            .eq('case_id', caseId)
            .eq('variant', parsed.data.variant)
            .eq('answer_hash', hash)
            .eq('user_id', userId)
            .maybeSingle();
        if (existingError) throw existingError;
        if (existing) return mapRun(existing as Record<string, unknown>);
        const { data, error } = await supabase
            .from('style_evaluation_runs')
            .insert({
                user_id: userId,
                case_id: caseId,
                variant: parsed.data.variant,
                source_draft_id: sourceDraftId ?? null,
                answer_hash: hash,
                metrics,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapRun(data as Record<string, unknown>);
    },

    async startBlindComparison(caseIdInput: unknown, input: unknown) {
        const caseId = parseId(caseIdInput, '평가 사례 ID');
        const parsed = blindStartInputSchema.safeParse(input);
        if (!parsed.success) throw new StyleEvaluationServiceError('invalid_input', '비교할 초안 ID를 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data: caseRecord, error: caseError } = await supabase
            .from('style_evaluation_cases')
            .select('*')
            .eq('id', caseId)
            .eq('user_id', userId)
            .maybeSingle();
        if (caseError) throw caseError;
        if (!caseRecord) throw new StyleEvaluationServiceError('not_found', '평가 사례를 찾을 수 없습니다.', 404);

        const evaluationCase = mapCase(caseRecord as Record<string, unknown>);
        const details = await writingSessionService.get(evaluationCase.writingSessionId);
        if (details.question.id !== evaluationCase.questionId || details.question.status !== 'finalized' || !details.question.finalAnswer?.trim()) {
            throw new StyleEvaluationServiceError('conflict', '현재 문항의 최종 답변을 확인할 수 없습니다.', 409);
        }
        const draft = details.drafts.find(item => item.id === parsed.data.draftId && item.status !== 'stale');
        if (!draft?.content?.trim()) throw new StyleEvaluationServiceError('not_found', '비교할 초안 후보를 찾을 수 없습니다.', 404);

        const finalContent = details.question.finalAnswer.trim();
        const draftContent = draft.content.trim();
        const finalHash = answerHash(finalContent);
        const draftHash = answerHash(draftContent);
        if (finalHash === draftHash) throw new StyleEvaluationServiceError('conflict', '내용이 같은 답변은 blind 비교에서 제외합니다.', 409);

        const studioOnLeft = randomInt(0, 2) === 0;
        const leftVariant: 'studio' | 'baseline' = studioOnLeft ? 'studio' : 'baseline';
        const rightVariant: 'studio' | 'baseline' = studioOnLeft ? 'baseline' : 'studio';
        const { data, error } = await supabase
            .from('style_evaluation_preferences')
            .insert({
                user_id: userId,
                case_id: caseId,
                left_variant: leftVariant,
                right_variant: rightVariant,
                left_answer_hash: studioOnLeft ? finalHash : draftHash,
                right_answer_hash: studioOnLeft ? draftHash : finalHash,
            })
            .select('*')
            .single();
        if (error) throw error;

        const preference = mapPreference(data as Record<string, unknown>);
        return {
            id: preference.id,
            leftContent: studioOnLeft ? finalContent : draftContent,
            rightContent: studioOnLeft ? draftContent : finalContent,
            createdAt: preference.createdAt,
        };
    },

    async submitBlindPreference(caseIdInput: unknown, input: unknown) {
        const caseId = parseId(caseIdInput, '평가 사례 ID');
        const parsed = blindSubmitInputSchema.safeParse(input);
        if (!parsed.success) throw new StyleEvaluationServiceError('invalid_input', '비교 선택을 확인해 주세요.', 400);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data: row, error } = await supabase
            .from('style_evaluation_preferences')
            .select('*')
            .eq('id', parsed.data.preferenceId)
            .eq('case_id', caseId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw error;
        if (!row) throw new StyleEvaluationServiceError('not_found', 'blind 비교를 찾을 수 없습니다.', 404);

        const preference = mapPreference(row as Record<string, unknown>);
        if (preference.selectedSide) throw new StyleEvaluationServiceError('conflict', '이미 선택한 비교입니다.', 409);
        const selectedVariant = parsed.data.selectedSide === 'left' ? preference.leftVariant : preference.rightVariant;
        const respondedAt = new Date().toISOString();
        const { data: updated, error: updateError } = await supabase
            .from('style_evaluation_preferences')
            .update({
                selected_side: parsed.data.selectedSide,
                selected_variant: selectedVariant,
                responded_at: respondedAt,
            })
            .eq('id', preference.id)
            .eq('case_id', caseId)
            .eq('user_id', userId)
            .is('selected_side', null)
            .select('*')
            .maybeSingle();
        if (updateError) throw updateError;
        if (!updated) throw new StyleEvaluationServiceError('conflict', '이미 선택한 비교입니다.', 409);
        const result = mapPreference(updated as Record<string, unknown>);
        return {
            id: result.id,
            selectedSide: result.selectedSide,
            respondedAt: result.respondedAt,
        };
    },
};

export { answerHash, countOccurrences, mapCase, mapPreference, mapRun };
