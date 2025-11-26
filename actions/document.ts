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

    return data as Document[];
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
    const tagsString = formData.get('tags') as string; // Assuming tags are passed as JSON string or comma-separated

    // Handle tags: if it's a JSON string, parse it. If it's comma-separated, split it.
    // For simplicity, let's assume the form sends a JSON stringified array or we default to empty.
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
            status: 'pending',
            tags: tags,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating document:', error);
        throw new Error('Failed to create document');
    }

    return data;
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
