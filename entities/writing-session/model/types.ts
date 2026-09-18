import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema, JsonObjectSchema } from '@/shared/types';

export const WritingSessionStateSchema = z.enum([
    'evidence_selecting',
    'outline_selecting',
    'drafting',
    'comparing',
    'editing',
    'finalized',
    'exported',
]);
export type WritingSessionState = z.infer<typeof WritingSessionStateSchema>;

export const WritingSessionSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    jobTargetId: DomainIdSchema.optional(),
    coverLetterQuestionId: DomainIdSchema.optional(),
    state: WritingSessionStateSchema,
    styleProfileId: DomainIdSchema.optional(),
    generationSettings: JsonObjectSchema.default({}),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
    finalizedAt: DomainTimestampSchema.optional(),
});
export type WritingSession = z.infer<typeof WritingSessionSchema>;

export const EvidenceMatchSelectionSchema = z.enum(['suggested', 'selected', 'rejected', 'locked']);
export type EvidenceMatchSelection = z.infer<typeof EvidenceMatchSelectionSchema>;

export const EvidenceMatchSchema = z.object({
    id: DomainIdSchema,
    writingSessionId: DomainIdSchema,
    userId: DomainUserIdSchema,
    jobRequirementId: DomainIdSchema.optional(),
    evidenceRecordId: DomainIdSchema,
    retrievalScore: z.number().min(0).max(1).optional(),
    rerankScore: z.number().min(0).max(1).optional(),
    reason: z.string().max(2_000).optional(),
    risks: z.array(z.string().max(500)).max(20).default([]),
    selectionState: EvidenceMatchSelectionSchema,
});
export type EvidenceMatch = z.infer<typeof EvidenceMatchSchema>;

export const OutlineStrategySchema = z.enum(['problem_solving', 'collaboration', 'growth', 'custom']);
export type OutlineStrategy = z.infer<typeof OutlineStrategySchema>;

export const OutlineCandidateStatusSchema = z.enum(['generated', 'selected', 'rejected', 'stale']);
export type OutlineCandidateStatus = z.infer<typeof OutlineCandidateStatusSchema>;

export const OutlineCandidateSchema = z.object({
    id: DomainIdSchema,
    writingSessionId: DomainIdSchema,
    userId: DomainUserIdSchema,
    strategy: OutlineStrategySchema,
    thesis: z.string().min(1).max(3_000),
    structure: z.array(z.string().min(1).max(2_000)).min(1).max(20),
    evidenceRecordIds: z.array(DomainIdSchema).max(50),
    requirementIds: z.array(DomainIdSchema).max(50),
    status: OutlineCandidateStatusSchema,
    createdAt: DomainTimestampSchema,
});
export type OutlineCandidate = z.infer<typeof OutlineCandidateSchema>;
