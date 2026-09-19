-- M5-a: user-owned style profiles and approved writing examples.
-- Style examples are a separate trust boundary from factual evidence.

create table if not exists public.style_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 100),
    sentence_length jsonb not null default '{}'::jsonb,
    ending_style text[] not null default '{}',
    preferred_connectors text[] not null default '{}',
    banned_expressions text[] not null default '{}',
    exaggeration_level numeric check (exaggeration_level is null or exaggeration_level between 0 and 1),
    rules jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.style_examples (
    id uuid primary key default gen_random_uuid(),
    style_profile_id uuid not null references public.style_profiles(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    source text not null check (source in ('user_authored', 'approved_final')),
    content text not null check (char_length(content) between 1 and 20000),
    approved boolean not null default false,
    created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'writing_sessions_style_profile_fk'
          and conrelid = 'public.writing_sessions'::regclass
    ) then
        alter table public.writing_sessions
            add constraint writing_sessions_style_profile_fk
            foreign key (style_profile_id) references public.style_profiles(id) on delete set null
            not valid;
    end if;
end
$$;

create index if not exists style_profiles_user_updated_idx
    on public.style_profiles(user_id, updated_at desc);
create index if not exists style_examples_profile_approved_idx
    on public.style_examples(user_id, style_profile_id, approved, created_at desc);

grant select, insert, update, delete on table public.style_profiles, public.style_examples to authenticated;

alter table public.style_profiles enable row level security;
alter table public.style_profiles force row level security;
alter table public.style_examples enable row level security;
alter table public.style_examples force row level security;

drop policy if exists "style_profiles_own" on public.style_profiles;
create policy "style_profiles_own" on public.style_profiles
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "style_examples_own" on public.style_examples;
create policy "style_examples_own" on public.style_examples
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_profiles profile
            where profile.id = style_profile_id and profile.user_id = auth.uid()
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_profiles profile
            where profile.id = style_profile_id and profile.user_id = auth.uid()
        )
    );
