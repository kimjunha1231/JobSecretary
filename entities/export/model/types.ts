import { z } from 'zod';

export const PdfExportKindSchema = z.enum(['cover_letter', 'legacy_document', 'career_profile', 'portfolio']);
export type PdfExportKind = z.infer<typeof PdfExportKindSchema>;

export const PdfSectionSchema = z.object({
    heading: z.string().trim().min(1).max(5_000),
    body: z.string().max(100_000),
    charCount: z.number().int().min(0).max(100_000),
});
export type PdfSection = z.infer<typeof PdfSectionSchema>;

export const PdfExportPayloadSchema = z.object({
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().max(500).optional(),
    company: z.string().trim().max(200).optional(),
    role: z.string().trim().max(200).optional(),
    sections: z.array(PdfSectionSchema).min(1).max(100),
});
export type PdfExportPayload = z.infer<typeof PdfExportPayloadSchema>;
