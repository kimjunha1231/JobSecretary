-- Add is_favorite column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
