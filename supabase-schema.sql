-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  job_post_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Create index on company for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company);

-- Enable Row Level Security (optional, for future auth)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (update when adding auth)
CREATE POLICY "Allow all operations" ON documents
  FOR ALL
  USING (true)
  WITH CHECK (true);
