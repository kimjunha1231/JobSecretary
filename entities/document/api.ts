'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Document, Status } from './model';

// Query keys
export const documentKeys = {
  all: ['documents'] as const,
  list: () => [...documentKeys.all, 'list'] as const,
  detail: (id: string) => [...documentKeys.all, 'detail', id] as const,
  archived: () => [...documentKeys.all, 'archived'] as const,
};

// Fetch all documents
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

      return (data || []).map(doc => ({
        id: doc.id,
        user_id: doc.user_id,
        title: doc.title || '',
        company: doc.company || '',
        role: doc.role || '',
        content: doc.content || '',
        status: doc.status as Status,
        tags: doc.tags || [],
        createdAt: doc.created_at,
        jobPostUrl: doc.job_post_url,
        position: doc.position,
        deadline: doc.deadline,
        isFavorite: doc.is_favorite,
        isArchived: doc.is_archived,
        documentScreeningStatus: doc.document_screening_status,
      }));
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

      return (data || []).map(doc => ({
        id: doc.id,
        user_id: doc.user_id,
        title: doc.title || '',
        company: doc.company || '',
        role: doc.role || '',
        content: doc.content || '',
        status: doc.status as Status,
        tags: doc.tags || [],
        createdAt: doc.created_at,
        jobPostUrl: doc.job_post_url,
        position: doc.position,
        deadline: doc.deadline,
        isFavorite: doc.is_favorite,
        isArchived: doc.is_archived,
        documentScreeningStatus: doc.document_screening_status,
      }));
    },
  });
}

// Fetch single document
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

      return {
        id: data.id,
        user_id: data.user_id,
        title: data.title || '',
        company: data.company || '',
        role: data.role || '',
        content: data.content || '',
        status: data.status as Status,
        tags: data.tags || [],
        createdAt: data.created_at,
        jobPostUrl: data.job_post_url,
        position: data.position,
        deadline: data.deadline,
        isFavorite: data.is_favorite,
        isArchived: data.is_archived,
        documentScreeningStatus: data.document_screening_status,
      };
    },
    enabled: !!id,
  });
}

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
      
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.jobPostUrl !== undefined) dbUpdates.job_post_url = updates.jobPostUrl;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
      if (updates.documentScreeningStatus !== undefined) dbUpdates.document_screening_status = updates.documentScreeningStatus;

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
          is_archived: false,
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
