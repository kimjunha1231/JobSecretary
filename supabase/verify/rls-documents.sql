-- Run this read-only query in the Supabase SQL editor before and after applying
-- the M0 migration. Any unexpected permissive policy must be reviewed or
-- removed explicitly; policy expressions are combined with OR by PostgreSQL.

select
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    permissive,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'documents'
order by policyname;

select
    relrowsecurity as row_level_security_enabled,
    relforcerowsecurity as row_level_security_forced
from pg_class
where oid = 'public.documents'::regclass;
