-- Add document_screening_status column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS document_screening_status TEXT CHECK (document_screening_status IN ('pass', 'fail'));
