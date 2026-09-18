-- Run after migrations with a Supabase SQL editor role.
-- Confirms the M2 warning column is present and the source RLS policies remain enabled.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced,
    exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.policyname = c.relname || '_own'
    ) as has_owner_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('source_documents', 'source_fragments');

select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'source_documents'
  and column_name = 'extraction_warnings';
