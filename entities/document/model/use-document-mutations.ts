'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Document, Status } from '../model';
import { documentKeys } from './keys';
import { requestDocumentApi } from '../api/client';

// Toggle favorite mutation
export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
            await requestDocumentApi(`/api/documents?id=${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ isFavorite }),
            });
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
            await requestDocumentApi(`/api/documents?id=${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
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
            await requestDocumentApi(`/api/documents?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
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
            await requestDocumentApi(`/api/documents?id=${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ isArchived }),
            });
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
            await Promise.all(documents.map(doc =>
                requestDocumentApi(`/api/documents?id=${encodeURIComponent(doc.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ position: doc.position, status: doc.status }),
                })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

// Add document mutation
export function useCreateDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (doc: Omit<Document, 'id' | 'createdAt' | 'user_id'>) => {
            return requestDocumentApi<Document>('/api/documents', {
                method: 'POST',
                body: JSON.stringify(doc),
            });
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
            await requestDocumentApi('/api/documents/archive', {
                method: 'POST',
                body: JSON.stringify({ ids }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}
