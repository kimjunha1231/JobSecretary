-- Add is_archived column if it doesn't exist
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Update all existing documents to be archived
UPDATE public.documents SET is_archived = true WHERE is_archived IS NULL OR is_archived = false;
