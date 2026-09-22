import { z } from 'zod';
import { DomainTimestampSchema, DomainUserIdSchema } from '@/shared/types';

const httpUrlSchema = (maxLength: number) => z.string()
    .trim()
    .max(maxLength)
    .refine(value => {
        if (!value) return true;
        try {
            const url = new URL(value);
            return (url.protocol === 'https:' || url.protocol === 'http:')
                && url.username.length === 0
                && url.password.length === 0;
        } catch {
            return false;
        }
    }, 'http 또는 https 링크를 입력해 주세요.')
    .default('');

export const CareerProfileFieldsSchema = z.object({
    fullName: z.string().trim().max(120).default(''),
    headline: z.string().trim().max(160).default(''),
    summary: z.string().trim().max(2_000).default(''),
    email: z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, '이메일 주소를 확인해 주세요.').default(''),
    phone: z.string().trim().max(60).default(''),
    location: z.string().trim().max(120).default(''),
    websiteUrl: httpUrlSchema(300),
    githubUrl: httpUrlSchema(300),
    linkedinUrl: httpUrlSchema(300),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).default([])
        .transform(skills => [...new Set(skills)]),
}).strict();

export type CareerProfileFields = z.infer<typeof CareerProfileFieldsSchema>;
export type CareerProfileInput = z.input<typeof CareerProfileFieldsSchema>;

/**
 * Narrow, non-contact subset that a user may explicitly include in a writing
 * session. This is guidance only; approved career activity remains the source
 * for concrete claims and citations.
 */
export const CareerProfileWritingContextSchema = z.object({
    headline: z.string().trim().max(160).default(''),
    summary: z.string().trim().max(2_000).default(''),
    skills: z.array(z.string().trim().min(1).max(60)).max(30)
        .transform(skills => [...new Set(skills)]).default([]),
}).strict();
export type CareerProfileWritingContext = z.infer<typeof CareerProfileWritingContextSchema>;

export const CareerProfileSchema = CareerProfileFieldsSchema.extend({
    userId: DomainUserIdSchema,
    updatedAt: DomainTimestampSchema,
});
export type CareerProfile = z.infer<typeof CareerProfileSchema>;
