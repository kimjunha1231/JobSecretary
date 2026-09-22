'use client';

import { useQuery } from '@tanstack/react-query';
import { Document } from '../model';
import { documentKeys } from './keys';

// Fetch single document by ID
export function useDocument(id: string) {
    return useQuery({
        queryKey: documentKeys.detail(id),
        queryFn: async (): Promise<Document | null> => {
            const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
                credentials: 'same-origin',
            });

            if (response.status === 404) return null;
            if (!response.ok) {
                throw new Error('문서를 불러오지 못했습니다.');
            }

            return response.json() as Promise<Document>;
        },
        enabled: !!id,
    });
}
