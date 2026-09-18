import { z } from 'zod';
import { DomainIdSchema, DomainTimestampSchema, DomainUserIdSchema, JsonObjectSchema } from '@/shared/types';

export const SourceDocumentKindSchema = z.enum([
    'resume',
    'portfolio',
    'cover_letter',
    'job_post',
    'talent_page',
    'github',
    'other',
]);
export type SourceDocumentKind = z.infer<typeof SourceDocumentKindSchema>;

export const SourceDocumentOriginSchema = z.enum(['upload', 'url', 'pasted_text']);
export type SourceDocumentOrigin = z.infer<typeof SourceDocumentOriginSchema>;

export const SourceDocumentStatusSchema = z.enum([
    'registered',
    'fetching',
    'uploaded',
    'extracting',
    'needs_review',
    'approved',
    'archived',
    'failed',
    'retrying',
    'manual_input',
]);
export type SourceDocumentStatus = z.infer<typeof SourceDocumentStatusSchema>;

export const ExtractionMethodSchema = z.enum(['direct_text', 'ocr', 'manual', 'none']);
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;

export const SourceDocumentSchema = z.object({
    id: DomainIdSchema,
    userId: DomainUserIdSchema,
    kind: SourceDocumentKindSchema,
    title: z.string().min(1).max(200),
    originType: SourceDocumentOriginSchema,
    sourceUrl: z.string().url().optional(),
    storagePath: z.string().max(500).optional(),
    rawText: z.string().max(500_000).optional(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    mimeType: z.string().max(100).optional(),
    pageCount: z.number().int().min(1).max(10_000).optional(),
    status: SourceDocumentStatusSchema,
    extractionMethod: ExtractionMethodSchema,
    extractionVersion: z.string().max(50).optional(),
    extractionWarnings: z.array(z.string().max(500)).max(20).default([]),
    fetchedAt: DomainTimestampSchema.optional(),
    approvedAt: DomainTimestampSchema.optional(),
    createdAt: DomainTimestampSchema,
    updatedAt: DomainTimestampSchema,
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SourceDocumentInputSchema = SourceDocumentSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    status: SourceDocumentStatusSchema.default('registered'),
    extractionMethod: ExtractionMethodSchema.default('none'),
});
export type SourceDocumentInput = z.infer<typeof SourceDocumentInputSchema>;

export const SourceFragmentSchema = z.object({
    id: DomainIdSchema,
    sourceDocumentId: DomainIdSchema,
    userId: DomainUserIdSchema,
    locator: JsonObjectSchema,
    content: z.string().min(1).max(100_000),
    createdAt: DomainTimestampSchema,
});
export type SourceFragment = z.infer<typeof SourceFragmentSchema>;

export const SourceFragmentInputSchema = SourceFragmentSchema.omit({
    id: true,
    userId: true,
    createdAt: true,
});
export type SourceFragmentInput = z.infer<typeof SourceFragmentInputSchema>;
