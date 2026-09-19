-- M5-b: keep approved style examples reusable globally or for one cover-letter question.
-- Existing examples remain global (question_id is null).

alter table public.style_examples
    add column if not exists question_id uuid references public.cover_letter_questions(id) on delete set null;

create index if not exists style_examples_user_profile_question_idx
    on public.style_examples(user_id, style_profile_id, question_id, approved, created_at desc);

drop policy if exists "style_examples_own" on public.style_examples;
create policy "style_examples_own" on public.style_examples
    for all to authenticated
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_profiles profile
            where profile.id = style_profile_id and profile.user_id = auth.uid()
        )
        and (
            question_id is null
            or exists (
                select 1 from public.cover_letter_questions question
                where question.id = style_examples.question_id and question.user_id = auth.uid()
            )
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.style_profiles profile
            where profile.id = style_profile_id and profile.user_id = auth.uid()
        )
        and (
            question_id is null
            or exists (
                select 1 from public.cover_letter_questions question
                where question.id = style_examples.question_id and question.user_id = auth.uid()
            )
        )
    );
