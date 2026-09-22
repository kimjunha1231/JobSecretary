-- Read-only M4 check. Run after the M4 migration in a Supabase SQL editor.
-- Every writing table should have forced RLS and an owner policy.

select
    c.relname as table_name,
    c.relrowsecurity as row_level_security_enabled,
    c.relforcerowsecurity as row_level_security_forced,
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
  and c.relname in (
      'writing_sessions',
      'evidence_matches',
      'outline_candidates',
      'draft_candidates',
      'draft_revisions',
      'draft_fact_citations'
  )
order by c.relname;

select
    tablename,
    policyname,
    roles,
    cmd,
    permissive,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
      'writing_sessions',
      'evidence_matches',
      'outline_candidates',
      'draft_candidates',
      'draft_revisions',
      'draft_fact_citations'
  )
order by tablename, policyname;
