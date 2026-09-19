-- M5-j: let a user explicitly promote an approved, user-owned cover-letter
-- source into a style profile without mixing it with factual evidence.

do $$
begin
    if to_regclass('public.style_examples') is not null then
        alter table public.style_examples
            add column if not exists source_document_id uuid references public.source_documents(id) on delete set null;

        alter table public.style_examples
            drop constraint if exists style_examples_source_check;

        alter table public.style_examples
            add constraint style_examples_source_check
            check (source in ('user_authored', 'approved_final', 'source_document'));
    end if;
end
$$;

create index if not exists style_examples_source_document_idx
    on public.style_examples(user_id, style_profile_id, source_document_id)
    where source = 'source_document';

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
        and (
            source_document_id is null
            or exists (
                select 1 from public.source_documents source_document
                where source_document.id = style_examples.source_document_id
                  and source_document.user_id = auth.uid()
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
        and (
            source_document_id is null
            or exists (
                select 1 from public.source_documents source_document
                where source_document.id = style_examples.source_document_id
                  and source_document.user_id = auth.uid()
            )
        )
        and (
            source <> 'source_document'
            or (
                source_document_id is not null
                and exists (
                    select 1 from public.source_documents source_document
                    where source_document.id = style_examples.source_document_id
                      and source_document.user_id = auth.uid()
                      and source_document.kind = 'cover_letter'
                      and source_document.status = 'approved'
                )
            )
        )
    );

grant select, insert, update, delete on table public.style_examples to authenticated;
