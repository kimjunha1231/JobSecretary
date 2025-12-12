'use server';

import { createServerSupabaseClient } from '@/shared/api/server';
import { RecommendedDoc } from '@/shared/types';
import { logger } from "@/shared/lib";

export async function searchDocumentsByTags(tags: string[]): Promise<RecommendedDoc[]> {
    if (!tags || tags.length === 0) return [];

    try {
        const supabase = await createServerSupabaseClient();


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
        logger.error('Error searching documents by tags:', error);
        return [];
    }
}
