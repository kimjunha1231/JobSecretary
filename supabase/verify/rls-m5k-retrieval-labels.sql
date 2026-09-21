-- Read-only M5-k check. Run after the writing-studio and domain migrations.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced,
    exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename = c.relname
          and p.policyname = 'retrieval_evaluation_labels_own'
    ) as has_owner_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'retrieval_evaluation_labels';

select
    column_name,
    data_type,
    is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'retrieval_evaluation_labels'
order by ordinal_position;

select
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
  and tc.table_name = 'retrieval_evaluation_labels'
order by tc.constraint_name, kcu.ordinal_position;

select
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'retrieval_evaluation_labels'
order by policyname;
