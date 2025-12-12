'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Document } from '../model';
import { documentKeys } from './keys';
import { mapRecordToDocument, DocumentRecord } from '../repository';

// Fetch all documents (non-archived)
export function useDocuments() {
    return useQuery({
        queryKey: documentKeys.list(),
        queryFn: async (): Promise<Document[]> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_archived', false)
                .order('position', { ascending: true });

            if (error) throw error;

            return (data || []).map((record) => mapRecordToDocument(record as DocumentRecord));
        },
    });
}

// Fetch archived documents
export function useArchivedDocuments() {
    return useQuery({
        queryKey: documentKeys.archived(),
        queryFn: async (): Promise<Document[]> => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_archived', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((record) => mapRecordToDocument(record as DocumentRecord));
        },
    });
}
