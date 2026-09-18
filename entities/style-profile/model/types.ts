import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema, JsonObjectSchema } from '@/shared/types';

export const StyleExampleSourceSchema = z.enum(['user_authored', 'approved_final']);
export type StyleExampleSource = z.infer<typeof StyleExampleSourceSchema>;

export const StyleProfileSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    name: z.string().min(1).max(100),
    sentenceLength: z.object({
        min: z.number().int().min(1).max(10_000).optional(),
        max: z.number().int().min(1).max(10_000).optional(),
        average: z.number().min(0).max(10_000).optional(),
    }).default({}),
    endingStyle: z.array(z.string().min(1).max(100)).max(20).default([]),
    preferredConnectors: z.array(z.string().min(1).max(100)).max(100).default([]),
    bannedExpressions: z.array(z.string().min(1).max(100)).max(100).default([]),
    exaggerationLevel: z.number().min(0).max(1).optional(),
    rules: JsonObjectSchema.default({}),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type StyleProfile = z.infer<typeof StyleProfileSchema>;

export const StyleExampleSchema = z.object({
    id: DomainIdSchema,
    styleProfileId: DomainIdSchema,
    userId: DomainUserIdSchema,
    source: StyleExampleSourceSchema,
    content: z.string().min(1).max(20_000),
    approved: z.boolean().default(false),
    createdAt: DomainTimestampSchema,
});
export type StyleExample = z.infer<typeof StyleExampleSchema>;
