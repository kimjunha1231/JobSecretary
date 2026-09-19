-- M2-d: private source originals. Paths are always prefixed with auth.uid().
-- Apply after the source document tables and review the policies before production rollout.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'source-documents',
    'source-documents',
    false,
    10485760,
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'text/html',
        'application/xhtml+xml'
    ]::text[]
)
on conflict (id) do update set
    name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "source_objects_select_own" on storage.objects;
create policy "source_objects_select_own"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'source-documents'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "source_objects_insert_own" on storage.objects;
create policy "source_objects_insert_own"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'source-documents'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "source_objects_update_own" on storage.objects;
create policy "source_objects_update_own"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'source-documents'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    )
    with check (
        bucket_id = 'source-documents'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );

drop policy if exists "source_objects_delete_own" on storage.objects;
create policy "source_objects_delete_own"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'source-documents'
        and (storage.foldername(name))[1] = (select auth.uid()::text)
    );
