-- Add is_archived column to documents table
ALTER TABLE documents ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- Update existing documents to be unarchived (optional, as default handles it for new rows, but good for clarity)
UPDATE documents SET is_archived = FALSE WHERE is_archived IS NULL;
