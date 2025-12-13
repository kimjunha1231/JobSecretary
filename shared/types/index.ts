import React from 'react';

// Re-export domain types from entities layer
export type { Document, Status, ChatMessage, RecommendedDoc } from '@/entities/document';

// UI Props types (domain-agnostic)
export interface BentoItemProps {
  className?: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

// Backward compatibility alias
export type { Document as Application } from '@/entities/document';