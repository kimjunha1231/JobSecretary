'use server';

import { createServerSupabaseClient } from '@/shared/api/server';
import { Document } from './model';
import { mapRecordToDocument, mapDocumentToRecord, DocumentRecord } from './repository';
import { logger } from '@/shared/lib';
import { z } from 'zod';

// Validation schemas for server actions (subset of model schemas with validation rules)
const CreateDocumentInputSchema = z.object({
    title: z.string().min(1, "제목은 필수입니다."),
    company: z.string().min(1, "회사명은 필수입니다."),
    role: z.string().min(1, "직무는 필수입니다."),
    content: z.string(),
    status: z.enum(['writing', 'applied', 'interview', 'pass', 'fail']).default('writing'),
    deadline: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
    jobPostUrl: z.string().url().optional().or(z.literal('')),
    position: z.number().optional(),
    isFavorite: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    documentScreeningStatus: z.enum(['pass', 'fail']).nullable().optional(),
});

const UpdateDocumentInputSchema = CreateDocumentInputSchema.partial();

export async function getDocuments(): Promise<Document[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('Error fetching documents:', error);
        return [];
    }

    return data.map((doc: DocumentRecord) => mapRecordToDocument(doc));
}

export async function createDocument(formData: FormData) {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const rawData = {
        title: formData.get('title') as string,
        company: formData.get('company') as string,
        role: formData.get('role') as string,
        content: formData.get('content') as string,
        status: (formData.get('status') as string) || 'writing',
        deadline: formData.get('deadline') as string,
        date: formData.get('date') as string,
        tags: [] as string[],
        jobPostUrl: formData.get('jobPostUrl') as string || undefined,
    };

    const tagsString = formData.get('tags') as string;
    try {
        if (tagsString) {
            rawData.tags = JSON.parse(tagsString);
        }
    } catch (e) {
        logger.error("Failed to parse tags", e);
        rawData.tags = [];
    }

    // Validate with Zod
    const validationResult = CreateDocumentInputSchema.safeParse(rawData);

    if (!validationResult.success) {
        logger.error("Validation Error:", validationResult.error);
        throw new Error(validationResult.error.issues[0].message);
    }

    const validatedData = validationResult.data;

    // Auto-generate logo (first letter of company)
    const logo = validatedData.company ? validatedData.company.charAt(0).toUpperCase() : 'C';

    const { data, error } = await supabase
        .from('documents')
        .insert({
            user_id: user.id,
            title: validatedData.title,
            company: validatedData.company,
            role: validatedData.role,
            content: validatedData.content,
            status: validatedData.status,
            tags: validatedData.tags,
            deadline: validatedData.deadline,
            date: validatedData.date,
            job_post_url: validatedData.jobPostUrl,
            logo,
            is_archived: validatedData.isArchived ?? false
        })
        .select()
        .single();

    if (error) {
        logger.error('Error creating document:', error);
        throw new Error('Failed to create document');
    }

    return data;
}

export async function updateDocument(id: string, updates: Partial<Document>) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Validate with Zod
    const validationResult = UpdateDocumentInputSchema.safeParse(updates);

    if (!validationResult.success) {
        logger.error("Validation Error:", validationResult.error);
        throw new Error(validationResult.error.issues[0].message);
    }

    const validatedUpdates = validationResult.data;

    // Use repository mapping function
    const updateData = mapDocumentToRecord(validatedUpdates as Partial<Document>);

    const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        logger.error('Error updating document:', error);
        throw error;
    }

    return data;
}

export async function updateDocumentStatus(id: string, status: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        logger.error('Error updating document status:', error);
        throw new Error('Failed to update document status');
    }

    return { success: true };
}

export async function deleteDocument(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        logger.error('Error deleting document:', error);
        throw new Error('Failed to delete document');
    }

    return { success: true };
}

export async function getUniqueTags(): Promise<string[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from('documents')
        .select('tags');

    if (error) {
        logger.error('Error fetching tags:', error);
        return [];
    }

    const allTags = data.flatMap(doc => doc.tags || []);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return uniqueTags;
}

export async function updateDocumentOrder(items: { id: string; position: number }[]) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const updates = items.map(({ id, position }) =>
        supabase
            .from('documents')
            .update({ position })
            .eq('id', id)
            .eq('user_id', user.id)
    );

    await Promise.all(updates);

    return { success: true };
}

export async function toggleDocumentFavorite(id: string, isFavorite: boolean) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        logger.error('Error updating document favorite status:', error);
        throw new Error(error.message);
    }

    return { success: true };
}

export async function archiveDocuments(ids: string[]) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ is_archived: true })
        .in('id', ids)
        .eq('user_id', user.id);

    if (error) {
        logger.error('Error archiving documents:', error);
        throw new Error('Failed to archive documents');
    }

    return { success: true };
}
