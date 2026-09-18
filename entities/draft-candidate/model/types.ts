import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema, JsonObjectSchema } from '@/shared/types';

export const DraftCandidateStatusSchema = z.enum(['generated', 'selected', 'partially_used', 'rejected', 'stale']);
export type DraftCandidateStatus = z.infer<typeof DraftCandidateStatusSchema>;

export const DraftCandidateSchema = z.object({
    id: DomainIdSchema,
    writingSessionId: DomainIdSchema,
    userId: DomainUserIdSchema,
    outlineCandidateId: DomainIdSchema.optional(),
    content: z.string().min(1).max(100_000),
    charCount: z.number().int().min(0).max(100_000),
    evidenceMap: JsonObjectSchema.default({}),
    validationResult: JsonObjectSchema.default({}),
    model: z.string().max(200).optional(),
    promptVersion: z.string().max(100).optional(),
    generationRunId: DomainIdSchema.optional(),
    status: DraftCandidateStatusSchema,
    createdAt: DomainTimestampSchema,
});
export type DraftCandidate = z.infer<typeof DraftCandidateSchema>;

export const DraftRevisionEditorSchema = z.enum(['user', 'ai']);
export type DraftRevisionEditor = z.infer<typeof DraftRevisionEditorSchema>;

export const DraftRevisionSchema = z.object({
    id: DomainIdSchema,
    writingSessionId: DomainIdSchema,
    userId: DomainUserIdSchema,
    parentRevisionId: DomainIdSchema.optional(),
    content: z.string().max(100_000),
    editor: DraftRevisionEditorSchema,
    changeReason: z.string().max(1_000).optional(),
    diffSummary: z.string().max(5_000).optional(),
    createdAt: DomainTimestampSchema,
});
export type DraftRevision = z.infer<typeof DraftRevisionSchema>;
