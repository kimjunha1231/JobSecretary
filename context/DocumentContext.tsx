'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CoverLetter } from '../types';

interface DocumentContextType {
  documents: CoverLetter[];
  addDocument: (doc: Omit<CoverLetter, 'id' | 'createdAt'>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<CoverLetter>) => Promise<void>;
  stats: {
    total: number;
    companies: number;
    lastActive: string;
  };
  isLoading: boolean;
  refreshDocuments: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents');
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

  const addDocument = async (doc: Omit<CoverLetter, 'id' | 'createdAt'>) => {
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

  const updateDocument = async (id: string, updates: Partial<CoverLetter>) => {
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

  const stats = {
    total: documents.length,
    companies: new Set(documents.map(d => d.company)).size,
    lastActive: documents.length > 0 ? documents[0].createdAt : 'N/A',
  };

  return (
    <DocumentContext.Provider value={{ documents, addDocument, deleteDocument, updateDocument, stats, isLoading, refreshDocuments }}>
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