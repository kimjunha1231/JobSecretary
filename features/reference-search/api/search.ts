'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { RecommendedDoc } from '@/shared/types';

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

                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {

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


        const { data, error } = await supabase
            .from('documents')
            .select('id, title, company, role, content, tags')
            .overlaps('tags', tags)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        return (data || []).map((doc) => ({
            id: doc.id,
            companyName: doc.company,
            originalContent: doc.content,
            subtitle: doc.role,
            aiAdvice: '',
            similarityScore: 0,
            tags: doc.tags
        }));
    } catch (error) {
        console.error('Error searching documents by tags:', error);
        return [];
    }
}
