import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema } from '../../../shared/types/index.ts';

export const CoverLetterStatusSchema = z.enum(['writing', 'applied', 'interview', 'pass', 'fail', 'archived']);
export type CoverLetterStatus = z.infer<typeof CoverLetterStatusSchema>;

export const CoverLetterSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    jobTargetId: DomainIdSchema.optional(),
    legacyDocumentId: DomainIdSchema.optional(),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    deadline: z.string().max(100).optional(),
    status: CoverLetterStatusSchema,
    version: z.number().int().min(1).max(10_000),
    legacyContent: z.string().max(500_000).optional(),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

export const CoverLetterQuestionStatusSchema = z.enum(['writing', 'finalized', 'needs_review', 'archived']);
export type CoverLetterQuestionStatus = z.infer<typeof CoverLetterQuestionStatusSchema>;

export const CoverLetterQuestionSchema = z.object({
    id: DomainIdSchema,
    coverLetterId: DomainIdSchema,
    userId: DomainUserIdSchema,
    question: z.string().min(1).max(5_000),
    charLimit: z.number().int().min(0).max(100_000).optional(),
    position: z.number().int().min(0).max(10_000),
    finalAnswer: z.string().max(100_000).optional(),
    status: CoverLetterQuestionStatusSchema,
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type CoverLetterQuestion = z.infer<typeof CoverLetterQuestionSchema>;

export const LegacyCoverLetterQuestionSchema = z.object({
    question: z.string().min(1).max(5_000),
    answer: z.string().max(100_000),
    charLimit: z.number().int().min(0).max(100_000).optional(),
    position: z.number().int().min(0).max(10_000),
});
export type LegacyCoverLetterQuestion = z.infer<typeof LegacyCoverLetterQuestionSchema>;

export const LegacyCoverLetterDraftSchema = z.object({
    legacyDocumentId: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    status: CoverLetterStatusSchema,
    deadline: z.string().max(100).optional(),
    legacyContent: z.string().max(500_000),
    questions: z.array(LegacyCoverLetterQuestionSchema).min(1),
    parseStatus: z.enum(['parsed', 'needs_review']),
    warnings: z.array(z.string().max(500)).max(20),
});
export type LegacyCoverLetterDraft = z.infer<typeof LegacyCoverLetterDraftSchema>;
