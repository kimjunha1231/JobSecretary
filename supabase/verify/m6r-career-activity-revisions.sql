-- Read-only M6-r checks. Run after the career activity revision migration.
select
    count(*) = 4 as has_revision_columns
from information_schema.columns
where table_schema = 'public'
  and table_name = 'evidence_records'
  and column_name in ('revision_number', 'revision_of', 'restored_from_id', 'career_item_snapshot');

select
    c.relrowsecurity as row_security_enabled,
    has_table_privilege('authenticated', 'public.evidence_records', 'SELECT') as authenticated_can_read_evidence,
    has_table_privilege('authenticated', 'public.evidence_sources', 'SELECT') as authenticated_can_read_sources
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'evidence_records';

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
