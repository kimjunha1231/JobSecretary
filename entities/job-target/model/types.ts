import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema } from '@/shared/types';

export const JobTargetStatusSchema = z.enum(['draft', 'collecting_sources', 'analyzed', 'reviewed', 'active', 'closed']);
export type JobTargetStatus = z.infer<typeof JobTargetStatusSchema>;

export const JobTargetSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    employmentType: z.string().max(100).optional(),
    seniority: z.string().max(100).optional(),
    deadline: z.string().max(100).optional(),
    status: JobTargetStatusSchema,
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type JobTarget = z.infer<typeof JobTargetSchema>;

export const JobTargetInputSchema = JobTargetSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: JobTargetStatusSchema.default('draft'),
});
export type JobTargetInput = z.infer<typeof JobTargetInputSchema>;

export const JobTargetSourceRoleSchema = z.enum(['job_post', 'talent', 'company', 'manual']);
export type JobTargetSourceRole = z.infer<typeof JobTargetSourceRoleSchema>;

export const JobTargetSourceSchema = z.object({
    jobTargetId: DomainIdSchema,
    sourceDocumentId: DomainIdSchema,
    userId: DomainUserIdSchema,
    sourceRole: JobTargetSourceRoleSchema,
    isPrimary: z.boolean().default(false),
});
export type JobTargetSource = z.infer<typeof JobTargetSourceSchema>;

export const JobRequirementCategorySchema = z.enum(['responsibility', 'required', 'preferred', 'value', 'question']);
export type JobRequirementCategory = z.infer<typeof JobRequirementCategorySchema>;

export const JobRequirementStatusSchema = z.enum(['suggested', 'approved', 'rejected']);
export type JobRequirementStatus = z.infer<typeof JobRequirementStatusSchema>;

export const JobRequirementSchema = z.object({
    id: DomainIdSchema,
    jobTargetId: DomainIdSchema,
    userId: DomainUserIdSchema,
    category: JobRequirementCategorySchema,
    text: z.string().min(1).max(2_000),
    priority: z.number().int().min(0).max(100).default(0),
    confidence: z.number().min(0).max(1).optional(),
    sourceFragmentId: DomainIdSchema.optional(),
    status: JobRequirementStatusSchema,
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type JobRequirement = z.infer<typeof JobRequirementSchema>;

export const JobRequirementInputSchema = JobRequirementSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: JobRequirementStatusSchema.default('suggested'),
});
export type JobRequirementInput = z.infer<typeof JobRequirementInputSchema>;
