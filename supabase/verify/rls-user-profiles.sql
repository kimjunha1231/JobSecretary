-- Read-only check for the consent/profile table used by /api/user-profile.

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
  and tablename = 'user_profiles'
order by policyname;

select
    relrowsecurity as row_level_security_enabled,
    relforcerowsecurity as row_level_security_forced
from pg_class
where oid = 'public.user_profiles'::regclass;
