-- M4-a: persistent writing sessions, evidence choices, outline candidates,
-- draft candidates, and revision history. This migration is additive.

create table if not exists public.writing_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    job_target_id uuid not null references public.job_targets(id) on delete cascade,
    cover_letter_question_id uuid references public.cover_letter_questions(id) on delete set null,
    state text not null default 'evidence_selecting' check (state in (
        'evidence_selecting', 'outline_selecting', 'drafting', 'comparing',
        'editing', 'finalized', 'exported'
    )),
    style_profile_id uuid,
    generation_settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    finalized_at timestamptz
);

create table if not exists public.evidence_matches (
    id uuid primary key default gen_random_uuid(),
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    job_requirement_id uuid references public.job_requirements(id) on delete cascade,
    evidence_record_id uuid not null references public.evidence_records(id) on delete cascade,
    retrieval_score numeric check (retrieval_score is null or retrieval_score between 0 and 1),
    rerank_score numeric check (rerank_score is null or rerank_score between 0 and 1),
    reason text,
    risks jsonb not null default '[]'::jsonb,
    selection_state text not null default 'suggested' check (selection_state in ('suggested', 'selected', 'rejected', 'locked')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.outline_candidates (
    id uuid primary key default gen_random_uuid(),
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    strategy text not null check (strategy in ('problem_solving', 'collaboration', 'growth', 'custom')),
    thesis text not null,
    structure text[] not null default '{}',
    evidence_record_ids uuid[] not null default '{}',
    requirement_ids uuid[] not null default '{}',
    status text not null default 'generated' check (status in ('generated', 'selected', 'rejected', 'stale')),
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draft_candidates (
    id uuid primary key default gen_random_uuid(),
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    outline_candidate_id uuid references public.outline_candidates(id) on delete set null,
    content text not null,
    char_count integer not null check (char_count between 0 and 100000),
    evidence_map jsonb not null default '{}'::jsonb,
    validation_result jsonb not null default '{}'::jsonb,
    model text,
    prompt_version text,
    generation_run_id uuid,
    status text not null default 'generated' check (status in ('generated', 'selected', 'partially_used', 'rejected', 'stale')),
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draft_revisions (
    id uuid primary key default gen_random_uuid(),
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    parent_revision_id uuid references public.draft_revisions(id) on delete set null,
    content text not null,
    editor text not null check (editor in ('user', 'ai')),
    change_reason text,
    diff_summary text,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists writing_sessions_user_state_idx
    on public.writing_sessions(user_id, state, updated_at desc);
create index if not exists evidence_matches_session_selection_idx
    on public.evidence_matches(user_id, writing_session_id, selection_state);
create index if not exists outline_candidates_session_status_idx
    on public.outline_candidates(user_id, writing_session_id, status);
create index if not exists draft_candidates_session_status_idx
    on public.draft_candidates(user_id, writing_session_id, status);
create index if not exists draft_revisions_session_created_idx
    on public.draft_revisions(user_id, writing_session_id, created_at desc);

grant select, insert, update, delete on table
    public.writing_sessions,
    public.evidence_matches,
    public.outline_candidates,
    public.draft_candidates,
    public.draft_revisions
to authenticated;

alter table public.writing_sessions enable row level security;
alter table public.writing_sessions force row level security;
alter table public.evidence_matches enable row level security;
alter table public.evidence_matches force row level security;
alter table public.outline_candidates enable row level security;
alter table public.outline_candidates force row level security;
alter table public.draft_candidates enable row level security;
alter table public.draft_candidates force row level security;
alter table public.draft_revisions enable row level security;
alter table public.draft_revisions force row level security;

drop policy if exists "writing_sessions_own" on public.writing_sessions;
create policy "writing_sessions_own" on public.writing_sessions
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "evidence_matches_own" on public.evidence_matches;
create policy "evidence_matches_own" on public.evidence_matches
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "outline_candidates_own" on public.outline_candidates;
create policy "outline_candidates_own" on public.outline_candidates
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "draft_candidates_own" on public.draft_candidates;
create policy "draft_candidates_own" on public.draft_candidates
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "draft_revisions_own" on public.draft_revisions;
create policy "draft_revisions_own" on public.draft_revisions
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
