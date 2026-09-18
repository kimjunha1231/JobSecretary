-- M2: retain parser warnings so a user can review an imported source later.
-- This is additive and does not modify or delete legacy documents.

alter table public.source_documents
    add column if not exists extraction_warnings jsonb not null default '[]'::jsonb;

alter table public.source_documents
    drop constraint if exists source_documents_extraction_warnings_array;

alter table public.source_documents
    add constraint source_documents_extraction_warnings_array
    check (jsonb_typeof(extraction_warnings) = 'array');
