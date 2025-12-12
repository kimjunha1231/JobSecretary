import React from 'react';



export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  relatedDocIds?: string[];
}

export interface BentoItemProps {
  className?: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

// Kanban Board Types
export type Status = 'writing' | 'applied' | 'interview' | 'pass' | 'fail';

export interface Document {
  id: string;
  user_id: string; // Added for compatibility
  title: string;
  company: string;
  role: string;
  content: string;
  status: Status;
  tags: string[];
  createdAt: string;
  jobPostUrl?: string;
  position?: number;
  deadline?: string;
  date?: string;
  logo?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  documentScreeningStatus?: 'pass' | 'fail' | null;
}

export interface Application extends Document { } // Alias for backward compatibility if needed

export interface RecommendedDoc {
  id: string;
  companyName: string;
  originalContent: string;
  subtitle?: string;
  aiAdvice: string;
  similarityScore: number;
  tags?: string[];
}