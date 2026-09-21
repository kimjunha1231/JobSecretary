-- M5-k: explicit user-authored relevance labels for retrieval evaluation.
-- A NULL evidence_record_id is an intentional "no relevant activity" label for
-- the requirement. The table stores IDs only; it never copies source content.

create table if not exists public.retrieval_evaluation_labels (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    writing_session_id uuid not null references public.writing_sessions(id) on delete cascade,
    question_id uuid not null references public.cover_letter_questions(id) on delete cascade,
    job_requirement_id uuid not null references public.job_requirements(id) on delete cascade,
    evidence_record_id uuid references public.evidence_records(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists retrieval_evaluation_labels_pair_idx
    on public.retrieval_evaluation_labels(
        user_id,
        writing_session_id,
        question_id,
        job_requirement_id,
        evidence_record_id
    )
    where evidence_record_id is not null;
create index if not exists retrieval_evaluation_labels_session_idx
    on public.retrieval_evaluation_labels(user_id, writing_session_id, question_id, job_requirement_id);

grant select, insert, update, delete on table public.retrieval_evaluation_labels to authenticated;

alter table public.retrieval_evaluation_labels enable row level security;
alter table public.retrieval_evaluation_labels force row level security;

drop policy if exists "retrieval_evaluation_labels_own" on public.retrieval_evaluation_labels;
create policy "retrieval_evaluation_labels_own" on public.retrieval_evaluation_labels
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1
            from public.writing_sessions session
            where session.id = retrieval_evaluation_labels.writing_session_id
              and session.user_id = auth.uid()
        )
        and exists (
            select 1
            from public.cover_letter_questions question
            where question.id = retrieval_evaluation_labels.question_id
              and question.user_id = auth.uid()
        )
        and exists (
            select 1
            from public.job_requirements requirement
            where requirement.id = retrieval_evaluation_labels.job_requirement_id
              and requirement.user_id = auth.uid()
        )
        and (
            evidence_record_id is null
            or exists (
                select 1
                from public.evidence_records evidence
                where evidence.id = retrieval_evaluation_labels.evidence_record_id
                  and evidence.user_id = auth.uid()
            )
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1
            from public.writing_sessions session
            where session.id = retrieval_evaluation_labels.writing_session_id
              and session.user_id = auth.uid()
        )
        and exists (
            select 1
            from public.cover_letter_questions question
            where question.id = retrieval_evaluation_labels.question_id
              and question.user_id = auth.uid()
        )
        and exists (
            select 1
            from public.job_requirements requirement
            where requirement.id = retrieval_evaluation_labels.job_requirement_id
              and requirement.user_id = auth.uid()
        )
        and (
            evidence_record_id is null
            or exists (
                select 1
                from public.evidence_records evidence
                where evidence.id = retrieval_evaluation_labels.evidence_record_id
                  and evidence.user_id = auth.uid()
            )
        )
    );
