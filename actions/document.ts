'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Document } from '@/types';

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
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

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

    // Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const title = formData.get('title') as string;
    const company = formData.get('company') as string;
    const role = formData.get('role') as string;
    const content = formData.get('content') as string;
    const status = (formData.get('status') as string) || 'writing';
    const deadline = formData.get('deadline') as string;
    const date = formData.get('date') as string;
    const tagsString = formData.get('tags') as string;

    // Auto-generate logo (first letter of company)
    const logo = company ? company.charAt(0).toUpperCase() : 'C';

    let tags: string[] = [];
    try {
        if (tagsString) {
            tags = JSON.parse(tagsString);
        }
    } catch (e) {
        console.error("Failed to parse tags", e);
        tags = [];
    }

    const { data, error } = await supabase
        .from('documents')
        .insert({
            user_id: user.id,
            title,
            company,
            role,
            content,
            status,
            tags,
            deadline,
            date,
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

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.jobPostUrl !== undefined) updateData.job_post_url = updates.jobPostUrl;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.logo !== undefined) updateData.logo = updates.logo;
    if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
    if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
    if (updates.documentScreeningStatus !== undefined) updateData.document_screening_status = updates.documentScreeningStatus;

    const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure only the user's own documents can be updated
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

    // Flatten tags and get unique values
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

    // Update each item's position
    // Note: Supabase doesn't support bulk update with different values easily in one query without a stored procedure or multiple requests.
    // For a small number of items, parallel requests are okay.
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
