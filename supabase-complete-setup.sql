-- Complete Database Setup for CareerVault AI
-- This script sets up the documents table with all necessary columns and policies

-- 1. Clean up temporary table if it exists
DROP TABLE IF EXISTS applications;

-- 2. Ensure documents table exists
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  company text not null,
  role text not null,
  content text not null,
  job_post_url text,
  status text default 'writing',
  tags text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Add missing columns for Kanban features (idempotent)
DO $$
BEGIN
    -- Add position
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'position') THEN
        ALTER TABLE public.documents ADD COLUMN position integer DEFAULT 0;
    END IF;
    
    -- Add deadline
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'deadline') THEN
        ALTER TABLE public.documents ADD COLUMN deadline text;
    END IF;
    
    -- Add date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'date') THEN
        ALTER TABLE public.documents ADD COLUMN date text;
    END IF;
    
    -- Add logo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'logo') THEN
        ALTER TABLE public.documents ADD COLUMN logo text;
    END IF;
    
    -- Add is_favorite
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_favorite') THEN
        ALTER TABLE public.documents ADD COLUMN is_favorite boolean DEFAULT false;
    END IF;
    
    -- Add is_archived
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_archived') THEN
        ALTER TABLE public.documents ADD COLUMN is_archived boolean DEFAULT false;
    END IF;
    
    -- Add document_screening_status (NEW)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'document_screening_status') THEN
        ALTER TABLE public.documents ADD COLUMN document_screening_status text CHECK (document_screening_status IN ('pass', 'fail'));
    END IF;
END $$;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_position ON documents(position ASC);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_screening_status ON documents(document_screening_status);

-- 5. Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 6. Reset and Re-create Policies
DROP POLICY IF EXISTS "Allow all operations" ON documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Select
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

-- Insert
CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update
CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

-- Delete
CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);
