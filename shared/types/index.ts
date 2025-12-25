import React from 'react';

// UI Props types (domain-agnostic)
export interface BentoItemProps {
  className?: string;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}