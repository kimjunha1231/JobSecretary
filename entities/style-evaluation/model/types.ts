import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema } from '@/shared/types';

export const EvaluationVariantSchema = z.enum(['studio', 'baseline']);
export type EvaluationVariant = z.infer<typeof EvaluationVariantSchema>;

export const EvaluationStatusSchema = z.enum(['active', 'archived']);
export type EvaluationStatus = z.infer<typeof EvaluationStatusSchema>;

export const EvaluationMetricsSchema = z.object({
    charCount: z.number().int().min(0).max(100_000),
    charLimit: z.number().int().min(0).max(100_000),
    overLimit: z.boolean(),
    bannedExpressionCount: z.number().int().min(0).max(10_000),
    factSentenceCount: z.number().int().min(0).max(10_000),
    verifiedFactSentenceCount: z.number().int().min(0).max(10_000),
    factCitationCoverage: z.number().min(0).max(1),
    userRevisionRatio: z.number().min(0).max(1),
    score: z.number().min(0).max(100),
});
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;

export const StyleEvaluationCaseSchema = z.object({
    id: DomainIdSchema,
    userId: DomainIdSchema,
    writingSessionId: DomainIdSchema,
    questionId: DomainIdSchema,
    styleProfileId: DomainIdSchema.optional(),
    label: z.string().min(1).max(200),
    answerHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: EvaluationStatusSchema,
    metrics: EvaluationMetricsSchema,
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type StyleEvaluationCase = z.infer<typeof StyleEvaluationCaseSchema>;

export const StyleEvaluationRunSchema = z.object({
    id: DomainIdSchema,
    userId: DomainIdSchema,
    caseId: DomainIdSchema,
    variant: EvaluationVariantSchema,
    sourceDraftId: DomainIdSchema.optional(),
    answerHash: z.string().regex(/^[a-f0-9]{64}$/),
    metrics: EvaluationMetricsSchema,
    createdAt: DomainTimestampSchema,
});
export type StyleEvaluationRun = z.infer<typeof StyleEvaluationRunSchema>;

export const BlindComparisonSideSchema = z.enum(['left', 'right']);
export type BlindComparisonSide = z.infer<typeof BlindComparisonSideSchema>;

export const StyleEvaluationPreferenceSchema = z.object({
    id: DomainIdSchema,
    userId: DomainIdSchema,
    caseId: DomainIdSchema,
    leftVariant: EvaluationVariantSchema,
    rightVariant: EvaluationVariantSchema,
    leftAnswerHash: z.string().regex(/^[a-f0-9]{64}$/),
    rightAnswerHash: z.string().regex(/^[a-f0-9]{64}$/),
    selectedSide: BlindComparisonSideSchema.optional(),
    selectedVariant: EvaluationVariantSchema.optional(),
    createdAt: DomainTimestampSchema,
    respondedAt: DomainTimestampSchema.optional(),
});
export type StyleEvaluationPreference = z.infer<typeof StyleEvaluationPreferenceSchema>;

/**
 * Blind 비교에서 사용자가 고른 변형만 집계한 요약입니다.
 * 답변 원문과 해시는 포함하지 않아 프로필 화면에서 안전하게 노출할 수 있습니다.
 */
export const StylePreferenceSummarySchema = z.object({
    available: z.boolean(),
    totalComparisons: z.number().int().min(0),
    respondedComparisons: z.number().int().min(0),
    studioWins: z.number().int().min(0),
    baselineWins: z.number().int().min(0),
    lastRespondedAt: DomainTimestampSchema.optional(),
});
export type StylePreferenceSummary = z.infer<typeof StylePreferenceSummarySchema>;

export const BlindComparisonPromptSchema = z.object({
    id: DomainIdSchema,
    leftContent: z.string().min(1).max(100_000),
    rightContent: z.string().min(1).max(100_000),
    createdAt: DomainTimestampSchema,
});
export type BlindComparisonPrompt = z.infer<typeof BlindComparisonPromptSchema>;
