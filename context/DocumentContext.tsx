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
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      title: '2024 하반기 신입 공채',
      company: 'Samsung Electronics',
      role: 'Frontend Developer',
      content: '삼성전자 지원 동기...',
      createdAt: new Date().toISOString(),
      status: 'writing',
      tags: ['React', 'TypeScript'],
      isFavorite: true,
      isArchived: false,
    },
    {
      id: '2',
      title: 'NAVER Cloud 채용 연계형 인턴',
      company: 'NAVER Cloud',
      role: 'Cloud Engineer',
      content: '네이버 클라우드 지원...',
      createdAt: new Date().toISOString(),
      status: 'writing',
      tags: ['Cloud', 'AWS'],
      isFavorite: false,
      isArchived: false,
    },
    {
      id: '3',
      title: 'Kakao 2025 Blind Recruitment',
      company: 'Kakao',
      role: 'Backend Developer',
      content: '카카오 지원...',
      createdAt: new Date().toISOString(),
      status: 'applied',
      tags: ['Java', 'Spring'],
      isFavorite: true,
      isArchived: false,
    },
    {
      id: '4',
      title: 'LINE Global Engineering',
      company: 'LINE',
      role: 'Global Engineer',
      content: '라인 지원...',
      createdAt: new Date().toISOString(),
      status: 'interview',
      tags: ['Global', 'Messenger'],
      isFavorite: false,
      isArchived: false,
    },
    {
      id: '5',
      title: 'Coupang Tech',
      company: 'Coupang',
      role: 'Software Engineer',
      content: '쿠팡 지원...',
      createdAt: new Date().toISOString(),
      status: 'pass',
      tags: ['E-commerce'],
      isFavorite: false,
      isArchived: true,
      documentScreeningStatus: 'pass'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshDocuments = async () => {
    // No-op for mock
  };

  const addDocument = async (doc: Omit<Document, 'id' | 'createdAt' | 'user_id'>) => {
    const newDoc: Document = {
      ...doc,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      status: doc.status || 'writing',
      tags: doc.tags || [],
      isFavorite: false,
      isArchived: false,
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const deleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const archiveDocuments = async (ids: string[]) => {
    setDocuments(prev => prev.map(d => ids.includes(d.id) ? { ...d, isArchived: true } : d));
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