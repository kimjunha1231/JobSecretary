-- M6-h: one private candidate profile per authenticated user.

create table if not exists public.career_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default '' check (char_length(full_name) <= 120),
    headline text not null default '' check (char_length(headline) <= 160),
    summary text not null default '' check (char_length(summary) <= 2000),
    email text not null default '' check (char_length(email) <= 254),
    phone text not null default '' check (char_length(phone) <= 60),
    location text not null default '' check (char_length(location) <= 120),
    website_url text not null default '' check (char_length(website_url) <= 300),
    github_url text not null default '' check (char_length(github_url) <= 300),
    linkedin_url text not null default '' check (char_length(linkedin_url) <= 300),
    skills text[] not null default '{}',
    updated_at timestamptz not null default timezone('utc', now()),
    constraint career_profiles_skills_limit check (cardinality(skills) <= 30)
);

do $$
begin
    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'career_profiles'
          and policyname not in (
              'career_profiles_own',
              'career_profiles_select_own',
              'career_profiles_insert_own',
              'career_profiles_update_own'
          )
    ) then
        raise exception 'Unexpected career_profiles RLS policies exist; review supabase/verify/rls-m6h-career-profiles.sql before applying M6-h';
    end if;
end
$$;

revoke all on table public.career_profiles from anon, authenticated, public;
grant select, insert, update on table public.career_profiles to authenticated;

alter table public.career_profiles enable row level security;
alter table public.career_profiles force row level security;

drop policy if exists career_profiles_own on public.career_profiles;
drop policy if exists career_profiles_select_own on public.career_profiles;
drop policy if exists career_profiles_insert_own on public.career_profiles;
drop policy if exists career_profiles_update_own on public.career_profiles;

create policy career_profiles_select_own on public.career_profiles
    for select to authenticated
    using (auth.uid() = user_id);

create policy career_profiles_insert_own on public.career_profiles
    for insert to authenticated
    with check (auth.uid() = user_id);

create policy career_profiles_update_own on public.career_profiles
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
