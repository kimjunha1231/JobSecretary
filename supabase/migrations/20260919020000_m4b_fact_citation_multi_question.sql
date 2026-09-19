-- M4-b: multiple questions per writing session and sentence-level fact citations.
-- This migration is additive and backfills the M4-a rows before the new API starts
-- scoping candidates by question.

alter table public.writing_sessions
    add column if not exists cover_letter_id uuid references public.cover_letters(id) on delete cascade;

update public.writing_sessions ws
set cover_letter_id = clq.cover_letter_id
from public.cover_letter_questions clq
where ws.cover_letter_question_id = clq.id
  and ws.cover_letter_id is null;

alter table public.evidence_matches
    add column if not exists question_id uuid references public.cover_letter_questions(id) on delete cascade;
alter table public.outline_candidates
    add column if not exists question_id uuid references public.cover_letter_questions(id) on delete cascade;
alter table public.draft_candidates
    add column if not exists question_id uuid references public.cover_letter_questions(id) on delete cascade;
alter table public.draft_revisions
    add column if not exists question_id uuid references public.cover_letter_questions(id) on delete cascade;

update public.evidence_matches em
set question_id = ws.cover_letter_question_id
from public.writing_sessions ws
where em.writing_session_id = ws.id
  and em.question_id is null;
update public.outline_candidates oc
set question_id = ws.cover_letter_question_id
from public.writing_sessions ws
where oc.writing_session_id = ws.id
  and oc.question_id is null;
update public.draft_candidates dc
set question_id = ws.cover_letter_question_id
from public.writing_sessions ws
where dc.writing_session_id = ws.id
  and dc.question_id is null;
update public.draft_revisions dr
set question_id = ws.cover_letter_question_id
from public.writing_sessions ws
where dr.writing_session_id = ws.id
  and dr.question_id is null;

create table if not exists public.draft_fact_citations (
    id uuid primary key default gen_random_uuid(),
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    question_id uuid not null references public.cover_letter_questions(id) on delete cascade,
    draft_candidate_id uuid not null references public.draft_candidates(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    sentence_index integer not null check (sentence_index >= 0),
    sentence_text text not null,
    fact_type text not null default 'claim' check (fact_type in ('metric', 'date', 'named_entity', 'claim')),
    evidence_record_ids uuid[] not null default '{}',
    status text not null default 'verified' check (status in ('verified', 'unverified')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists writing_sessions_cover_letter_idx
    on public.writing_sessions(user_id, cover_letter_id, updated_at desc);
create index if not exists evidence_matches_question_idx
    on public.evidence_matches(user_id, writing_session_id, question_id, selection_state);
create index if not exists outline_candidates_question_idx
    on public.outline_candidates(user_id, writing_session_id, question_id, status);
create index if not exists draft_candidates_question_idx
    on public.draft_candidates(user_id, writing_session_id, question_id, status);
create index if not exists draft_revisions_question_idx
    on public.draft_revisions(user_id, writing_session_id, question_id, created_at desc);
create index if not exists draft_fact_citations_draft_idx
    on public.draft_fact_citations(user_id, writing_session_id, question_id, draft_candidate_id, sentence_index);

grant select, insert, update, delete on table public.draft_fact_citations to authenticated;

alter table public.draft_fact_citations enable row level security;
alter table public.draft_fact_citations force row level security;

drop policy if exists "draft_fact_citations_own" on public.draft_fact_citations;
create policy "draft_fact_citations_own" on public.draft_fact_citations
    for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
