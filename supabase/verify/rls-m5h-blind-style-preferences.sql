-- Read-only checks for M5-h. Run after the M5-c migration in a staging session.
select
    relname as table_name,
    relrowsecurity as row_level_security_enabled,
    relforcerowsecurity as forced_row_level_security
from pg_class
where oid = 'public.style_evaluation_preferences'::regclass;

select
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'style_evaluation_preferences';

select
    case
        when exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'style_evaluation_preferences'
              and column_name in ('left_answer_hash', 'right_answer_hash', 'selected_side')
        ) then 'ok'
        else 'missing_columns'
    end as blind_preference_columns;
