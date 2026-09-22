-- Read-only M6-h checks. Run after the career profile migration.

select
    c.relname as table_name,
    c.relrowsecurity as row_security_enabled,
    c.relforcerowsecurity as row_security_forced,
    count(p.policyname) = 3
        and count(p.policyname) filter (
            where p.roles::text = '{authenticated}'
              and p.permissive = 'PERMISSIVE'
              and (
                  (p.policyname = 'career_profiles_select_own'
                      and p.cmd = 'SELECT'
                      and p.qual is not null
                      and position('auth.uid()' in p.qual) > 0
                      and position('user_id' in p.qual) > 0
                      and p.with_check is null)
                  or (p.policyname = 'career_profiles_insert_own'
                      and p.cmd = 'INSERT'
                      and p.qual is null
                      and p.with_check is not null
                      and position('auth.uid()' in p.with_check) > 0
                      and position('user_id' in p.with_check) > 0)
                  or (p.policyname = 'career_profiles_update_own'
                      and p.cmd = 'UPDATE'
                      and p.qual is not null
                      and position('auth.uid()' in p.qual) > 0
                      and position('user_id' in p.qual) > 0
                      and p.with_check is not null
                      and position('auth.uid()' in p.with_check) > 0
                      and position('user_id' in p.with_check) > 0)
              )
        ) = 3 as has_only_expected_owner_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname = 'career_profiles'
group by c.relname, c.relrowsecurity, c.relforcerowsecurity;

-- Effective privileges include grants inherited from PUBLIC.
select
    not has_table_privilege('anon', 'public.career_profiles', 'SELECT')
        and not has_table_privilege('anon', 'public.career_profiles', 'INSERT')
        and not has_table_privilege('anon', 'public.career_profiles', 'UPDATE')
        and not has_table_privilege('anon', 'public.career_profiles', 'DELETE')
        and not has_table_privilege('anon', 'public.career_profiles', 'TRUNCATE')
        and not has_table_privilege('anon', 'public.career_profiles', 'REFERENCES')
        and not has_table_privilege('anon', 'public.career_profiles', 'TRIGGER') as anon_has_no_table_privileges,
    has_table_privilege('authenticated', 'public.career_profiles', 'SELECT')
        and has_table_privilege('authenticated', 'public.career_profiles', 'INSERT')
        and has_table_privilege('authenticated', 'public.career_profiles', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.career_profiles', 'DELETE')
        and not has_table_privilege('authenticated', 'public.career_profiles', 'TRUNCATE')
        and not has_table_privilege('authenticated', 'public.career_profiles', 'REFERENCES')
        and not has_table_privilege('authenticated', 'public.career_profiles', 'TRIGGER') as authenticated_has_minimum_privileges;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'career_profiles'
order by ordinal_position;

select
    exists (
        select 1
        from pg_constraint pk
        where pk.conrelid = 'public.career_profiles'::regclass
          and pk.contype = 'p'
          and pk.conkey = array[
              (select attnum from pg_attribute
               where attrelid = pk.conrelid and attname = 'user_id' and not attisdropped)
          ]::smallint[]
    ) as has_user_id_primary_key,
    exists (
        select 1
        from pg_constraint fk
        where fk.conrelid = 'public.career_profiles'::regclass
          and fk.contype = 'f'
          and fk.confrelid = 'auth.users'::regclass
          and fk.confdeltype = 'c'
          and fk.conkey = array[
              (select attnum from pg_attribute
               where attrelid = fk.conrelid and attname = 'user_id' and not attisdropped)
          ]::smallint[]
          and fk.confkey = array[
              (select attnum from pg_attribute
               where attrelid = fk.confrelid and attname = 'id' and not attisdropped)
          ]::smallint[]
    ) as has_auth_user_cascade_foreign_key,
    exists (
        select 1
        from pg_constraint skills
        where skills.conrelid = 'public.career_profiles'::regclass
          and skills.contype = 'c'
          and skills.conname = 'career_profiles_skills_limit'
          and pg_get_constraintdef(skills.oid) ilike '%cardinality(skills)%30%'
    ) as has_skills_limit,
    (
        select count(*) = 9
            and bool_and(
                case length_check.conname
                    when 'career_profiles_full_name_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%full_name%120%'
                    when 'career_profiles_headline_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%headline%160%'
                    when 'career_profiles_summary_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%summary%2000%'
                    when 'career_profiles_email_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%email%254%'
                    when 'career_profiles_phone_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%phone%60%'
                    when 'career_profiles_location_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%location%120%'
                    when 'career_profiles_website_url_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%website_url%300%'
                    when 'career_profiles_github_url_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%github_url%300%'
                    when 'career_profiles_linkedin_url_check' then pg_get_constraintdef(length_check.oid) ilike '%char_length%linkedin_url%300%'
                end
            )
        from pg_constraint length_check
        where length_check.conrelid = 'public.career_profiles'::regclass
          and length_check.contype = 'c'
          and length_check.conname in (
              'career_profiles_full_name_check',
              'career_profiles_headline_check',
              'career_profiles_summary_check',
              'career_profiles_email_check',
              'career_profiles_phone_check',
              'career_profiles_location_check',
              'career_profiles_website_url_check',
              'career_profiles_github_url_check',
              'career_profiles_linkedin_url_check'
          )
    ) as has_all_profile_length_checks;

select conname as constraint_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.career_profiles'::regclass
  and contype = 'c'
order by conname;

select
    conname as constraint_name,
    contype as constraint_type,
    confdeltype as foreign_key_delete_action,
    pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.career_profiles'::regclass
  and contype in ('p', 'f')
order by conname;

select tablename, policyname, roles, cmd, permissive, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'career_profiles'
order by policyname;
