-- Read-only M6-r checks. Run after the career activity revision migration.
select
    count(*) = 4 as has_revision_columns
from information_schema.columns
where table_schema = 'public'
  and table_name = 'evidence_records'
  and column_name in ('revision_number', 'revision_of', 'restored_from_id', 'career_item_snapshot');

select
    expected_table.table_name,
    coalesce(c.relrowsecurity, false) as row_security_enabled,
    coalesce(c.relforcerowsecurity, false) as row_security_forced,
    (
        select count(*) = 1
            and bool_and(
                policy_row.policyname = expected_table.table_name || '_own'
                and policy_row.roles::text = '{authenticated}'
                and policy_row.cmd = 'ALL'
                and policy_row.permissive = 'PERMISSIVE'
                and policy_row.qual is not null
                and regexp_replace(policy_row.qual, '\s', '', 'g') in ('(auth.uid()=user_id)', 'auth.uid()=user_id')
                and policy_row.with_check is not null
                and regexp_replace(policy_row.with_check, '\s', '', 'g') in ('(auth.uid()=user_id)', 'auth.uid()=user_id')
            )
        from pg_policies as policy_row
        where policy_row.schemaname = 'public'
          and policy_row.tablename = expected_table.table_name
    ) as has_only_authenticated_owner_policy
from unnest(array['career_items', 'evidence_records', 'evidence_sources']::text[]) as expected_table(table_name)
left join pg_namespace as n
  on n.nspname = 'public'
left join pg_class as c
  on c.relnamespace = n.oid
 and c.relname = expected_table.table_name
 and c.relkind in ('r', 'p')
order by expected_table.table_name;

-- SECURITY INVOKER RPCs need only the table privileges used by their bodies.
select
    has_table_privilege('authenticated', 'public.career_items', 'SELECT') as authenticated_can_read_career_items,
    has_table_privilege('authenticated', 'public.career_items', 'UPDATE') as authenticated_can_update_career_items,
    has_table_privilege('authenticated', 'public.evidence_records', 'SELECT') as authenticated_can_read_evidence,
    has_table_privilege('authenticated', 'public.evidence_records', 'INSERT') as authenticated_can_insert_evidence,
    has_table_privilege('authenticated', 'public.evidence_records', 'UPDATE') as authenticated_can_update_evidence,
    has_table_privilege('authenticated', 'public.evidence_sources', 'SELECT') as authenticated_can_read_sources,
    has_table_privilege('authenticated', 'public.evidence_sources', 'INSERT') as authenticated_can_restore_sources;

select
    p.proname as function_name,
    not p.prosecdef as uses_security_invoker,
    coalesce(p.proconfig @> array['search_path=""'], false) as has_empty_search_path,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
    not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_cannot_execute,
    not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as grant_entry
        where grant_entry.grantee = 0
          and grant_entry.privilege_type = 'EXECUTE'
    ) as public_cannot_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'revise_evidence_activity',
      'restore_evidence_activity_revision',
      'set_evidence_activity_status'
  )
order by p.proname;

select
    count(*) = 3 as has_all_revision_functions,
    bool_and(not p.prosecdef) as all_functions_use_security_invoker,
    bool_and(coalesce(p.proconfig @> array['search_path=""'], false)) as all_functions_have_empty_search_path,
    bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as authenticated_can_execute_all,
    bool_and(not has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_cannot_execute_any,
    bool_and(not exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as grant_entry
        where grant_entry.grantee = 0
          and grant_entry.privilege_type = 'EXECUTE'
    )) as public_cannot_execute_any
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
      'revise_evidence_activity',
      'restore_evidence_activity_revision',
      'set_evidence_activity_status'
  );
