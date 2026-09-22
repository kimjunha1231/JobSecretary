-- M0: protect consent/profile rows used by the account onboarding flow.

do $$
begin
    if to_regclass('public.user_profiles') is null then
        raise exception 'public.user_profiles must exist before applying user profile RLS';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_profiles'
          and policyname not in (
              'user_profiles_select_own',
              'user_profiles_insert_own',
              'user_profiles_update_own',
              'user_profiles_delete_own'
          )
    ) then
        raise exception 'Unexpected user_profiles RLS policies exist; review policies before applying M0';
    end if;
end
$$;

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;
drop policy if exists "user_profiles_delete_own" on public.user_profiles;

create policy "user_profiles_select_own"
    on public.user_profiles
    for select
    to authenticated
    using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
    on public.user_profiles
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
    on public.user_profiles
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "user_profiles_delete_own"
    on public.user_profiles
    for delete
    to authenticated
    using (auth.uid() = user_id);
