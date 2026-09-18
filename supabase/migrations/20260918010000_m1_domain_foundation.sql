-- M1: additive domain foundation for evidence-first writing.
-- Existing public.documents rows are intentionally untouched.

create table if not exists public.source_documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('resume', 'portfolio', 'cover_letter', 'job_post', 'talent_page', 'github', 'other')),
    title text not null,
    origin_type text not null check (origin_type in ('upload', 'url', 'pasted_text')),
    source_url text,
    storage_path text,
    raw_text text,
    content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
    mime_type text,
    page_count integer check (page_count is null or page_count between 1 and 10000),
    status text not null default 'registered' check (status in ('registered', 'fetching', 'uploaded', 'extracting', 'needs_review', 'approved', 'archived', 'failed', 'retrying', 'manual_input')),
    extraction_method text not null default 'none' check (extraction_method in ('direct_text', 'ocr', 'manual', 'none')),
    extraction_version text,
    fetched_at timestamptz,
    approved_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_fragments (
    id uuid primary key default gen_random_uuid(),
    source_document_id uuid not null references public.source_documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    locator jsonb not null default '{}'::jsonb,
    content text not null,
    created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.career_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null check (kind in ('project', 'work', 'education', 'award', 'leadership', 'community', 'other')),
    title text not null,
    organization text,
    role text,
    started_at text,
    ended_at text,
    is_current boolean not null default false,
    summary text,
    team_size integer check (team_size is null or team_size between 1 and 100000),
    contribution_note text,
    skills text[] not null default '{}',
    competency_tags text[] not null default '{}',
    status text not null default 'needs_review' check (status in ('suggested', 'needs_review', 'approved', 'superseded', 'archived')),
    version integer not null default 1 check (version > 0),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence_records (
    id uuid primary key default gen_random_uuid(),
    career_item_id uuid not null references public.career_items(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    situation text,
    problem text,
    action text,
    result text,
    learning text,
    metrics jsonb not null default '[]'::jsonb,
    skills text[] not null default '{}',
    competency_tags text[] not null default '{}',
    status text not null default 'needs_review' check (status in ('suggested', 'needs_review', 'approved', 'superseded', 'archived')),
    confidence numeric check (confidence is null or confidence between 0 and 1),
    version integer not null default 1 check (version > 0),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence_sources (
    evidence_record_id uuid not null references public.evidence_records(id) on delete cascade,
    source_fragment_id uuid not null references public.source_fragments(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    claim_type text not null check (claim_type in ('situation', 'problem', 'action', 'result', 'learning', 'metric', 'skill')),
    quote_excerpt text not null,
    is_primary boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    primary key (evidence_record_id, source_fragment_id, claim_type)
);

create table if not exists public.job_targets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    company text not null,
    role text not null,
    employment_type text,
    seniority text,
    deadline text,
    status text not null default 'draft' check (status in ('draft', 'collecting_sources', 'analyzed', 'reviewed', 'active', 'closed')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_target_sources (
    job_target_id uuid not null references public.job_targets(id) on delete cascade,
    source_document_id uuid not null references public.source_documents(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    source_role text not null check (source_role in ('job_post', 'talent', 'company', 'manual')),
    is_primary boolean not null default false,
    primary key (job_target_id, source_document_id, source_role)
);

create table if not exists public.job_requirements (
    id uuid primary key default gen_random_uuid(),
    job_target_id uuid not null references public.job_targets(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('responsibility', 'required', 'preferred', 'value', 'question')),
    text text not null,
    priority integer not null default 0 check (priority between 0 and 100),
    confidence numeric check (confidence is null or confidence between 0 and 1),
    source_fragment_id uuid references public.source_fragments(id) on delete set null,
    status text not null default 'suggested' check (status in ('suggested', 'approved', 'rejected')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cover_letters (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    job_target_id uuid references public.job_targets(id) on delete set null,
    legacy_document_id uuid,
    title text not null,
    company text not null,
    role text not null,
    deadline text,
    status text not null default 'writing' check (status in ('writing', 'applied', 'interview', 'pass', 'fail', 'archived')),
    version integer not null default 1 check (version > 0),
    legacy_content text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cover_letter_questions (
    id uuid primary key default gen_random_uuid(),
    cover_letter_id uuid not null references public.cover_letters(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    question text not null,
    char_limit integer check (char_limit is null or char_limit between 0 and 100000),
    position integer not null check (position >= 0),
    final_answer text,
    status text not null default 'writing' check (status in ('writing', 'finalized', 'needs_review', 'archived')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (cover_letter_id, position)
);

create index if not exists source_documents_user_status_idx on public.source_documents(user_id, status);
create index if not exists source_fragments_user_document_idx on public.source_fragments(user_id, source_document_id);
create index if not exists career_items_user_status_idx on public.career_items(user_id, status);
create index if not exists evidence_records_user_status_idx on public.evidence_records(user_id, status);
create index if not exists job_targets_user_status_idx on public.job_targets(user_id, status);
create index if not exists job_requirements_target_status_idx on public.job_requirements(user_id, job_target_id, status);
create index if not exists cover_letters_user_status_idx on public.cover_letters(user_id, status);
create index if not exists cover_letter_questions_cover_position_idx on public.cover_letter_questions(user_id, cover_letter_id, position);

grant select, insert, update, delete on table
    public.source_documents,
    public.source_fragments,
    public.career_items,
    public.evidence_records,
    public.evidence_sources,
    public.job_targets,
    public.job_target_sources,
    public.job_requirements,
    public.cover_letters,
    public.cover_letter_questions
to authenticated;

alter table public.source_documents enable row level security;
alter table public.source_documents force row level security;
alter table public.source_fragments enable row level security;
alter table public.source_fragments force row level security;
alter table public.career_items enable row level security;
alter table public.career_items force row level security;
alter table public.evidence_records enable row level security;
alter table public.evidence_records force row level security;
alter table public.evidence_sources enable row level security;
alter table public.evidence_sources force row level security;
alter table public.job_targets enable row level security;
alter table public.job_targets force row level security;
alter table public.job_target_sources enable row level security;
alter table public.job_target_sources force row level security;
alter table public.job_requirements enable row level security;
alter table public.job_requirements force row level security;
alter table public.cover_letters enable row level security;
alter table public.cover_letters force row level security;
alter table public.cover_letter_questions enable row level security;
alter table public.cover_letter_questions force row level security;

drop policy if exists "source_documents_own" on public.source_documents;
create policy "source_documents_own" on public.source_documents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "source_fragments_own" on public.source_fragments;
create policy "source_fragments_own" on public.source_fragments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "career_items_own" on public.career_items;
create policy "career_items_own" on public.career_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "evidence_records_own" on public.evidence_records;
create policy "evidence_records_own" on public.evidence_records for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "evidence_sources_own" on public.evidence_sources;
create policy "evidence_sources_own" on public.evidence_sources for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "job_targets_own" on public.job_targets;
create policy "job_targets_own" on public.job_targets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "job_target_sources_own" on public.job_target_sources;
create policy "job_target_sources_own" on public.job_target_sources for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "job_requirements_own" on public.job_requirements;
create policy "job_requirements_own" on public.job_requirements for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cover_letters_own" on public.cover_letters;
create policy "cover_letters_own" on public.cover_letters for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cover_letter_questions_own" on public.cover_letter_questions;
create policy "cover_letter_questions_own" on public.cover_letter_questions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
