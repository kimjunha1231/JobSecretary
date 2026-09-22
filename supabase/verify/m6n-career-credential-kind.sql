-- Read-only check for the M6-n career item kind constraint.
select exists (
    select 1
    from pg_constraint
    where conrelid = to_regclass('public.career_items')
      and conname = 'career_items_kind_check'
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%credential%'
) as has_credential_kind_check;
