import React from 'react';

export interface CoverLetter {
  id: string;
  title: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
  jobPostUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface BentoItemProps {
  className?: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}