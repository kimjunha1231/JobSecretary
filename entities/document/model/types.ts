import { z } from 'zod';

// Status types
export const StatusSchema = z.enum(['writing', 'applied', 'interview', 'pass', 'fail']);
export type Status = z.infer<typeof StatusSchema>;

// Document schema
export const DocumentSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    title: z.string(),
    company: z.string(),
    role: z.string(),
    content: z.string(),
    status: StatusSchema,
    tags: z.array(z.string()).default([]),
    createdAt: z.string(),
    jobPostUrl: z.string().optional(),
    position: z.number().optional(),
    deadline: z.string().optional(),
    date: z.string().optional(),
    logo: z.string().optional(),
    isFavorite: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    documentScreeningStatus: z.enum(['pass', 'fail']).nullable().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

// Create document input
export const CreateDocumentSchema = DocumentSchema.omit({
    id: true,
    user_id: true,
    createdAt: true
});
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

// Update document input
export const UpdateDocumentSchema = DocumentSchema.partial().required({ id: true });
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;

// Chat message for AI features
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    relatedDocIds?: string[];
}
