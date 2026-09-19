-- Read-only M5 check. Run after the style profile and question-example migrations
-- in Supabase SQL editor. Examples must be owned by both the authenticated user
-- and that user's profile; question-scoped examples must also reference that
-- user's cover-letter question.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced,
    exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.policyname in ('style_profiles_own', 'style_examples_own')
    ) as has_owner_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('style_profiles', 'style_examples')
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
  and tablename in ('style_profiles', 'style_examples')
order by tablename, policyname;

select
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('style_profiles', 'style_examples', 'writing_sessions', 'cover_letter_questions')
order by tc.table_name, tc.constraint_name;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'style_examples'
  and column_name = 'question_id';
