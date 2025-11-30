'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Document } from '../types';

interface DocumentContextType {
  documents: Document[];
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'user_id'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  stats: {
    total: number;
    companies: number;
    lastActive: string;
  };
  isLoading: boolean;
  refreshDocuments: () => Promise<void>;
  archiveDocuments: (ids: string[]) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents');

      if (response.status === 401) {
        setDocuments([]);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();

      // Transform API response to match CoverLetter type
      const transformedData = data.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        company: doc.company,
        role: doc.role,
        content: doc.content,
        createdAt: new Date(doc.created_at).toISOString().split('T')[0],
        jobPostUrl: doc.job_post_url,
        status: doc.status || 'writing',
        tags: doc.tags || [],
        deadline: doc.deadline,
        date: doc.date,
        logo: doc.logo,
        position: doc.position,
        isFavorite: doc.is_favorite,
        isArchived: doc.is_archived,
        documentScreeningStatus: doc.document_screening_status,
      }));

      setDocuments(transformedData);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  const addDocument = async (doc: Omit<Document, 'id' | 'createdAt' | 'user_id'>) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });

      if (!response.ok) throw new Error('Failed to create document');

      await refreshDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      await refreshDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update document');

      await refreshDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  };

  const archiveDocuments = async (ids: string[]) => {
    try {
      const response = await fetch('/api/documents/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Failed to archive documents');

      await refreshDocuments();
    } catch (error) {
      console.error('Error archiving documents:', error);
      throw error;
    }
  };

  const stats = useMemo(() => ({
    total: documents.length,
    companies: new Set(documents.map(d => d.company)).size,
    lastActive: documents.length > 0 ? documents[0].createdAt : 'N/A',
  }), [documents]);

  return (
    <DocumentContext.Provider value={{ documents, addDocument, deleteDocument, updateDocument, archiveDocuments, stats, isLoading, refreshDocuments }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};