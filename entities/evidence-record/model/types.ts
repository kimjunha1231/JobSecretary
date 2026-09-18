import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema, JsonObjectSchema } from '@/shared/types';

export const EvidenceRecordStatusSchema = z.enum(['suggested', 'needs_review', 'approved', 'superseded', 'archived']);
export type EvidenceRecordStatus = z.infer<typeof EvidenceRecordStatusSchema>;

export const EvidenceMetricSchema = z.object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(200),
    unit: z.string().max(50).optional(),
    baseline: z.string().max(200).optional(),
});
export type EvidenceMetric = z.infer<typeof EvidenceMetricSchema>;

export const EvidenceRecordSchema = z.object({
    id: DomainIdSchema,
    careerItemId: DomainIdSchema,
    userId: DomainUserIdSchema,
    situation: z.string().max(10_000).optional(),
    problem: z.string().max(10_000).optional(),
    action: z.string().max(10_000).optional(),
    result: z.string().max(10_000).optional(),
    learning: z.string().max(10_000).optional(),
    metrics: z.array(EvidenceMetricSchema).max(100).default([]),
    skills: z.array(z.string().min(1).max(100)).max(100).default([]),
    competencyTags: z.array(z.string().min(1).max(100)).max(100).default([]),
    status: EvidenceRecordStatusSchema,
    confidence: z.number().min(0).max(1).optional(),
    version: z.number().int().min(1).max(10_000),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const EvidenceRecordInputSchema = EvidenceRecordSchema.omit({
    id: true,
    userId: true,
    version: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: EvidenceRecordStatusSchema.default('needs_review'),
});
export type EvidenceRecordInput = z.infer<typeof EvidenceRecordInputSchema>;

export const EvidenceClaimTypeSchema = z.enum(['situation', 'problem', 'action', 'result', 'learning', 'metric', 'skill']);
export type EvidenceClaimType = z.infer<typeof EvidenceClaimTypeSchema>;

export const EvidenceSourceSchema = z.object({
    evidenceRecordId: DomainIdSchema,
    sourceFragmentId: DomainIdSchema,
    userId: DomainUserIdSchema,
    claimType: EvidenceClaimTypeSchema,
    quoteExcerpt: z.string().min(1).max(2_000),
    isPrimary: z.boolean().default(false),
    metadata: JsonObjectSchema.default({}),
});
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
