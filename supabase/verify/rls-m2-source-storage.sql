-- Read-only review checklist for M2 source originals.
-- Run with a database role that can inspect policies; do not use this file to mutate data.

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'source-documents';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'source_objects_%_own'
order by policyname;
