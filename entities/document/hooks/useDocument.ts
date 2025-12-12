'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Document } from '../model';
import { documentKeys } from './keys';
import { mapRecordToDocument, DocumentRecord } from '../repository';

// Fetch single document by ID
export function useDocument(id: string) {
    return useQuery({
        queryKey: documentKeys.detail(id),
        queryFn: async (): Promise<Document | null> => {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

            return mapRecordToDocument(data as DocumentRecord);
        },
        enabled: !!id,
    });
}
