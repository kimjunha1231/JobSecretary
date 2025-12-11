'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { RecommendedDoc } from '@/store/useDraftStore';

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

export async function searchDocumentsByTags(tags: string[]): Promise<RecommendedDoc[]> {
    if (!tags || tags.length === 0) return [];

    try {
        const supabase = await createClient();

        // Search for documents that contain ANY of the tags
        // Using Postgres array overlap operator (&&)
        const { data, error } = await supabase
            .from('documents')
            .select('id, title, company, role, content, tags')
            .overlaps('tags', tags)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        return (data || []).map((doc: any) => ({
            id: doc.id,
            companyName: doc.company,
            originalContent: doc.content,
            subtitle: doc.role, // Using role as subtitle
            aiAdvice: '', // No AI advice for tag search
            similarityScore: 0, // No similarity score
            tags: doc.tags
        }));
    } catch (error) {
        console.error('Error searching documents by tags:', error);
        return [];
    }
}
