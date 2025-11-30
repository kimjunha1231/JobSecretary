'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Document } from '@/types';
import { z } from 'zod';

// Helper to create Supabase Server Client
async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    );
}

// Zod Schemas
const DocumentSchema = z.object({
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

const UpdateDocumentSchema = DocumentSchema.partial();

export async function getDocuments(): Promise<Document[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching documents:', error);
        return [];
    }

    return data.map((doc: any) => ({
        ...doc,
        createdAt: doc.created_at,
        jobPostUrl: doc.job_post_url,
        deadline: doc.deadline || undefined,
        date: doc.date || undefined,
        logo: doc.logo || undefined,
        isFavorite: doc.is_favorite || false,
        isArchived: doc.is_archived || false,
        documentScreeningStatus: doc.document_screening_status as 'pass' | 'fail' | null || null,
    })) as Document[];
}

export async function createDocument(formData: FormData) {
    const supabase = await createClient();

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
        console.error("Failed to parse tags", e);
        rawData.tags = [];
    }

    // Validate with Zod
    const validationResult = DocumentSchema.safeParse(rawData);

    if (!validationResult.success) {
        console.error("Validation Error:", validationResult.error);
        throw new Error(validationResult.error.errors[0].message);
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
            is_archived: false
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating document:', error);
        throw new Error('Failed to create document');
    }

    return data;
}

export async function updateDocument(id: string, updates: Partial<Document>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Validate with Zod
    const validationResult = UpdateDocumentSchema.safeParse(updates);

    if (!validationResult.success) {
        console.error("Validation Error:", validationResult.error);
        throw new Error(validationResult.error.errors[0].message);
    }

    const validatedUpdates = validationResult.data;

    const updateData: any = {};
    if (validatedUpdates.title !== undefined) updateData.title = validatedUpdates.title;
    if (validatedUpdates.company !== undefined) updateData.company = validatedUpdates.company;
    if (validatedUpdates.role !== undefined) updateData.role = validatedUpdates.role;
    if (validatedUpdates.content !== undefined) updateData.content = validatedUpdates.content;
    if (validatedUpdates.status !== undefined) updateData.status = validatedUpdates.status;
    if (validatedUpdates.tags !== undefined) updateData.tags = validatedUpdates.tags;
    if (validatedUpdates.jobPostUrl !== undefined) updateData.job_post_url = validatedUpdates.jobPostUrl;
    if (validatedUpdates.position !== undefined) updateData.position = validatedUpdates.position;
    if (validatedUpdates.deadline !== undefined) updateData.deadline = validatedUpdates.deadline;
    if (validatedUpdates.date !== undefined) updateData.date = validatedUpdates.date;
    if (validatedUpdates.isFavorite !== undefined) updateData.is_favorite = validatedUpdates.isFavorite;
    if (validatedUpdates.isArchived !== undefined) updateData.is_archived = validatedUpdates.isArchived;
    if (validatedUpdates.documentScreeningStatus !== undefined) updateData.document_screening_status = validatedUpdates.documentScreeningStatus;

    // Logo update if company changes
    if (validatedUpdates.company) {
        updateData.logo = validatedUpdates.company.charAt(0).toUpperCase();
    }

    const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating document:', error);
        throw error;
    }

    return data;
}

export async function updateDocumentStatus(id: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating document status:', error);
        throw new Error('Failed to update document status');
    }

    return { success: true };
}

export async function deleteDocument(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting document:', error);
        throw new Error('Failed to delete document');
    }

    return { success: true };
}

export async function getUniqueTags(): Promise<string[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('documents')
        .select('tags');

    if (error) {
        console.error('Error fetching tags:', error);
        return [];
    }

    const allTags = data.flatMap(doc => doc.tags || []);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return uniqueTags;
}

export async function updateDocumentOrder(items: { id: string; position: number }[]) {
    const supabase = await createClient();
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error updating document favorite status:', error);
        throw new Error(error.message);
    }

    return { success: true };
}

export async function archiveDocuments(ids: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('documents')
        .update({ is_archived: true })
        .in('id', ids)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error archiving documents:', error);
        throw new Error('Failed to archive documents');
    }

    return { success: true };
}
