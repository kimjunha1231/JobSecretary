'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Document, Status } from '../model';
import { documentKeys } from './keys';
import { mapDocumentToRecord } from '../repository';

// Toggle favorite mutation
export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
            const { error } = await supabase
                .from('documents')
                .update({ is_favorite: isFavorite })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Update document mutation
export function useUpdateDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (doc: Partial<Document> & { id: string }) => {
            const { id, ...updates } = doc;
            const dbUpdates = mapDocumentToRecord(updates);

            const { error } = await supabase
                .from('documents')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Delete document mutation
export function useDeleteDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Archive document mutation
export function useArchiveDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
            const { error } = await supabase
                .from('documents')
                .update({ is_archived: isArchived })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Update document order mutation
export function useUpdateDocumentOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (documents: { id: string; position: number; status: Status }[]) => {
            const updates = documents.map(doc =>
                supabase
                    .from('documents')
                    .update({ position: doc.position, status: doc.status })
                    .eq('id', doc.id)
            );

            await Promise.all(updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Add document mutation
export function useAddDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (doc: Omit<Document, 'id' | 'createdAt' | 'user_id'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const logo = doc.company ? doc.company.charAt(0).toUpperCase() : 'C';

            const { data, error } = await supabase
                .from('documents')
                .insert({
                    user_id: user.id,
                    title: doc.title,
                    company: doc.company,
                    role: doc.role,
                    content: doc.content,
                    status: doc.status || 'writing',
                    tags: doc.tags || [],
                    deadline: doc.deadline,
                    job_post_url: doc.jobPostUrl,
                    logo,
                    is_archived: doc.isArchived ?? false,
                    is_favorite: false,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Archive multiple documents mutation
export function useArchiveDocuments() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('documents')
                .update({ is_archived: true })
                .in('id', ids)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}
