-- M0: enforce ownership at the database boundary for the existing documents table.
-- Apply this migration only after the project's documents schema is present.

do $$
begin
    if to_regclass('public.documents') is null then
        raise exception 'public.documents must exist before applying documents RLS';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'documents'
          and policyname not in (
              'documents_select_own',
              'documents_insert_own',
              'documents_update_own',
              'documents_delete_own'
          )
    ) then
        raise exception 'Unexpected documents RLS policies exist; review supabase/verify/rls-documents.sql before applying M0';
    end if;
end
$$;

alter table public.documents enable row level security;
alter table public.documents force row level security;

-- These names are owned by this migration. Existing policies with other names
-- must be reviewed with supabase/verify/rls-documents.sql before deployment;
-- PostgreSQL combines permissive policies with OR semantics.
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;

create policy "documents_select_own"
    on public.documents
    for select
    to authenticated
    using (auth.uid() = user_id);

create policy "documents_insert_own"
    on public.documents
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "documents_update_own"
    on public.documents
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "documents_delete_own"
    on public.documents
    for delete
    to authenticated
    using (auth.uid() = user_id);
