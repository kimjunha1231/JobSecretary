-- M5-c: user-owned deterministic golden-set cases and comparable evaluation runs.
-- Only answer hashes and metrics are stored here; answer text stays in the existing
-- writing-session/draft tables protected by their own RLS policies.

create table if not exists public.style_evaluation_cases (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    question_id uuid not null references public.cover_letter_questions(id) on delete cascade,
    style_profile_id uuid references public.style_profiles(id) on delete set null,
    label text not null check (char_length(label) between 1 and 200),
    answer_hash text not null check (answer_hash ~ '^[a-f0-9]{64}$'),
    status text not null default 'active' check (status in ('active', 'archived')),
    metrics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (user_id, writing_session_id, question_id, answer_hash)
);

create table if not exists public.style_evaluation_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    case_id uuid not null references public.style_evaluation_cases(id) on delete cascade,
    variant text not null check (variant in ('studio', 'baseline')),
    source_draft_id uuid references public.draft_candidates(id) on delete set null,
    answer_hash text not null check (answer_hash ~ '^[a-f0-9]{64}$'),
    metrics jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    unique (user_id, case_id, variant, answer_hash)
);

create index if not exists style_evaluation_cases_session_idx
    on public.style_evaluation_cases(user_id, writing_session_id, status, created_at desc);
create index if not exists style_evaluation_runs_case_idx
    on public.style_evaluation_runs(user_id, case_id, created_at desc);

grant select, insert, update, delete on table
    public.style_evaluation_cases,
    public.style_evaluation_runs
to authenticated;

alter table public.style_evaluation_cases enable row level security;
alter table public.style_evaluation_cases force row level security;
alter table public.style_evaluation_runs enable row level security;
alter table public.style_evaluation_runs force row level security;

drop policy if exists "style_evaluation_cases_own" on public.style_evaluation_cases;
create policy "style_evaluation_cases_own" on public.style_evaluation_cases
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.writing_sessions session
            where session.id = style_evaluation_cases.writing_session_id
              and session.user_id = auth.uid()
        )
        and exists (
            select 1 from public.cover_letter_questions question
            where question.id = style_evaluation_cases.question_id
              and question.user_id = auth.uid()
        )
        and (
            style_profile_id is null
            or exists (
                select 1 from public.style_profiles profile
                where profile.id = style_evaluation_cases.style_profile_id
                  and profile.user_id = auth.uid()
            )
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.writing_sessions session
            where session.id = style_evaluation_cases.writing_session_id
              and session.user_id = auth.uid()
        )
        and exists (
            select 1 from public.cover_letter_questions question
            where question.id = style_evaluation_cases.question_id
              and question.user_id = auth.uid()
        )
        and (
            style_profile_id is null
            or exists (
                select 1 from public.style_profiles profile
                where profile.id = style_evaluation_cases.style_profile_id
                  and profile.user_id = auth.uid()
            )
        )
    );

drop policy if exists "style_evaluation_runs_own" on public.style_evaluation_runs;
create policy "style_evaluation_runs_own" on public.style_evaluation_runs
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_evaluation_cases evaluation_case
            where evaluation_case.id = style_evaluation_runs.case_id
              and evaluation_case.user_id = auth.uid()
        )
        and (
            source_draft_id is null
            or exists (
                select 1 from public.draft_candidates draft
                where draft.id = style_evaluation_runs.source_draft_id
                  and draft.user_id = auth.uid()
            )
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_evaluation_cases evaluation_case
            where evaluation_case.id = style_evaluation_runs.case_id
              and evaluation_case.user_id = auth.uid()
        )
        and (
            source_draft_id is null
            or exists (
                select 1 from public.draft_candidates draft
                where draft.id = style_evaluation_runs.source_draft_id
                  and draft.user_id = auth.uid()
            )
        )
    );
