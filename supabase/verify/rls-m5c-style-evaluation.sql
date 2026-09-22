-- Read-only M5-c verification. Run after the style-evaluation migration in the
-- Supabase SQL editor. This does not insert, update, or delete user data.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced,
    exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.policyname in ('style_evaluation_cases_own', 'style_evaluation_runs_own')
    ) as has_owner_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('style_evaluation_cases', 'style_evaluation_runs')
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
  and tablename in ('style_evaluation_cases', 'style_evaluation_runs')
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
  and tc.table_name in ('style_evaluation_cases', 'style_evaluation_runs')
order by tc.table_name, tc.constraint_name;
