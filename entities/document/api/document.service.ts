import { createServerSupabaseClient } from '@/shared/api/server';
import { mapRecordToDocument, mapDocumentToRecord, type DocumentRecord } from './repository';
import { Document } from '../model';
import { z } from 'zod';

const documentInputFields = {
    title: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(200),
    content: z.string().max(100_000),
    status: z.enum(['writing', 'applied', 'interview', 'pass', 'fail']).default('writing'),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    jobPostUrl: z.string().url().or(z.literal('')).optional(),
    position: z.number().int().min(0).max(100_000).optional(),
    deadline: z.string().max(100).optional(),
    date: z.string().max(100).optional(),
    logo: z.string().max(10).optional(),
    isFavorite: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    documentScreeningStatus: z.enum(['pass', 'fail']).nullable().optional(),
};

const createDocumentInputSchema = z.object(documentInputFields);
const updateDocumentInputSchema = z.object(documentInputFields).partial().refine(
    value => Object.keys(value).length > 0,
    'At least one document field is required.',
);
const documentIdSchema = z.string().trim().min(1).max(200);

export const documentService = {
    async getDocuments(): Promise<Document[]> {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((record: DocumentRecord) => mapRecordToDocument(record));
    },

    async getDocument(id: string): Promise<Document | null> {
        const parsedId = documentIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new Error('Invalid document ID.');
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', parsedId.data)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        return data ? mapRecordToDocument(data as DocumentRecord) : null;
    },

    async createDocument(documentData: unknown): Promise<Document> {
        const validationResult = createDocumentInputSchema.safeParse(documentData);
        if (!validationResult.success) {
            throw new Error('Invalid document input.');
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const validatedData = validationResult.data;
        const dbRecord = mapDocumentToRecord(validatedData as Partial<Document>);

        // Set defaults
        if (!dbRecord.status) dbRecord.status = 'writing';
        if (!dbRecord.tags) dbRecord.tags = [];
        if (!dbRecord.position) dbRecord.position = 0;
        if (!dbRecord.logo && validatedData.company) {
            dbRecord.logo = validatedData.company.charAt(0).toUpperCase();
        }
        dbRecord.is_archived = Boolean(validatedData.isArchived);

        const { data, error } = await supabase
            .from('documents')
            .insert([{ user_id: user.id, ...dbRecord }])
            .select()
            .single();

        if (error) throw error;
        return mapRecordToDocument(data as DocumentRecord);
    },

    async deleteDocument(id: string): Promise<boolean> {
        const parsedId = documentIdSchema.safeParse(id);
        if (!parsedId.success) {
            throw new Error('Invalid document ID.');
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', parsedId.data)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    },

    async updateDocument(id: string, updates: unknown): Promise<Document> {
        const parsedId = documentIdSchema.safeParse(id);
        const validationResult = updateDocumentInputSchema.safeParse(updates);
        if (!parsedId.success || !validationResult.success) {
            throw new Error('Invalid document input.');
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const dbRecord = mapDocumentToRecord(validationResult.data as Partial<Document>);
        dbRecord.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('documents')
            .update(dbRecord)
            .eq('id', parsedId.data)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapRecordToDocument(data as DocumentRecord);
    }
};
