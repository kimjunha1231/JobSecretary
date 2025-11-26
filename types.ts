import React from 'react';

export interface Document {
  id: string;
  user_id: string;
  title: string;
  company: string;
  role: string;
  content: string;
  status: 'pending' | 'pass' | 'fail';
  tags: string[];
  createdAt: string;
  jobPostUrl?: string;
}

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