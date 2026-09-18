-- Read-only M1 check. Every listed table must have RLS enabled and forced,
-- and each policy must constrain rows by the denormalized user_id column.

select
    c.relname as table_name,
    c.relrowsecurity as row_level_security_enabled,
    c.relforcerowsecurity as row_level_security_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
      'source_documents',
      'source_fragments',
      'career_items',
      'evidence_records',
      'evidence_sources',
      'job_targets',
      'job_target_sources',
      'job_requirements',
      'cover_letters',
      'cover_letter_questions'
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
      'source_documents',
      'source_fragments',
      'career_items',
      'evidence_records',
      'evidence_sources',
      'job_targets',
      'job_target_sources',
      'job_requirements',
      'cover_letters',
      'cover_letter_questions'
  )
order by tablename, policyname;
