import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema } from '@/shared/types';

export const CareerItemKindSchema = z.enum([
    'project',
    'work',
    'education',
    'credential',
    'award',
    'leadership',
    'community',
    'other',
]);
export type CareerItemKind = z.infer<typeof CareerItemKindSchema>;

export const CAREER_ITEM_KIND_LABELS: Record<CareerItemKind, string> = {
    project: '프로젝트',
    work: '경력',
    education: '교육',
    credential: '자격·어학',
    award: '수상',
    leadership: '리더십',
    community: '커뮤니티',
    other: '기타',
};

export const CareerItemStatusSchema = z.enum(['suggested', 'needs_review', 'approved', 'superseded', 'archived']);
export type CareerItemStatus = z.infer<typeof CareerItemStatusSchema>;

export const CareerItemSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    kind: CareerItemKindSchema,
    title: z.string().min(1).max(200),
    organization: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
    startedAt: z.string().max(100).optional(),
    endedAt: z.string().max(100).optional(),
    isCurrent: z.boolean().default(false),
    summary: z.string().max(10_000).optional(),
    teamSize: z.number().int().min(1).max(100_000).optional(),
    contributionNote: z.string().max(10_000).optional(),
    skills: z.array(z.string().min(1).max(100)).max(100).default([]),
    competencyTags: z.array(z.string().min(1).max(100)).max(100).default([]),
    status: CareerItemStatusSchema,
    version: z.number().int().min(1).max(10_000),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type CareerItem = z.infer<typeof CareerItemSchema>;

export const CareerItemInputSchema = CareerItemSchema.omit({
    id: true,
    userId: true,
    version: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: CareerItemStatusSchema.default('needs_review'),
});
export type CareerItemInput = z.infer<typeof CareerItemInputSchema>;
