-- Add missing columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Drop applications table (cleanup)
DROP TABLE IF EXISTS applications;
