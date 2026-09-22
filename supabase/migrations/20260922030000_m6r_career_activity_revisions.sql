alter table public.evidence_records
    add column if not exists revision_number integer not null default 1,
    add column if not exists revision_of uuid references public.evidence_records(id) on delete set null,
    add column if not exists restored_from_id uuid references public.evidence_records(id) on delete set null,
    add column if not exists career_item_snapshot jsonb;

update public.evidence_records as current_record
set revision_number = numbered.revision_number
from (
    select id,
           row_number() over (
               partition by career_item_id
               order by created_at asc, id asc
           )::integer as revision_number
    from public.evidence_records
) as numbered
where current_record.id = numbered.id
  and current_record.revision_number = 1;

alter table public.evidence_records
    add constraint evidence_records_revision_number_positive
        check (revision_number > 0),
    add constraint evidence_records_career_snapshot_object
        check (career_item_snapshot is null or jsonb_typeof(career_item_snapshot) = 'object');

create index if not exists evidence_records_user_career_revision_idx
    on public.evidence_records (user_id, career_item_id, revision_number desc, created_at desc);

create or replace function public.revise_evidence_activity(
    p_record_id uuid,
    p_expected_record_version integer,
    p_expected_career_version integer,
    p_title text,
    p_kind text,
    p_organization text,
    p_role text,
    p_started_at text,
    p_ended_at text,
    p_is_current boolean,
    p_summary text,
    p_action text,
    p_result text,
    p_learning text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_career_item_id uuid;
    v_career public.career_items%rowtype;
    v_old_record public.evidence_records%rowtype;
    v_new_career public.career_items%rowtype;
    v_new_record public.evidence_records%rowtype;
    v_revision_number integer;
    v_updated_at timestamptz := now();
begin
    if v_user_id is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;

    if p_record_id is null
       or p_expected_record_version is null or p_expected_record_version < 1
       or p_expected_career_version is null or p_expected_career_version < 1
       or p_title is null or length(btrim(p_title)) not between 1 and 200
       or p_kind is null
       or p_kind not in ('project', 'work', 'education', 'credential', 'award', 'leadership', 'community', 'other')
       or p_organization is not null and length(btrim(p_organization)) > 200
       or p_role is not null and length(btrim(p_role)) > 200
       or p_started_at is not null and length(btrim(p_started_at)) > 100
       or p_ended_at is not null and length(btrim(p_ended_at)) > 100
       or p_is_current is null
       or p_summary is not null and length(btrim(p_summary)) > 10000
       or p_action is not null and length(btrim(p_action)) > 10000
       or p_result is not null and length(btrim(p_result)) > 10000
       or p_learning is not null and length(btrim(p_learning)) > 10000 then
        raise exception using errcode = '22023', message = 'Invalid activity revision';
    end if;

    select e.career_item_id
      into v_career_item_id
      from public.evidence_records as e
     where e.id = p_record_id
       and e.user_id = v_user_id;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;

    select c.*
      into v_career
      from public.career_items as c
     where c.id = v_career_item_id
       and c.user_id = v_user_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;

    select e.*
      into v_old_record
      from public.evidence_records as e
     where e.id = p_record_id
       and e.user_id = v_user_id
       and e.career_item_id = v_career_item_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;
    if v_career.status <> 'approved' or v_old_record.status <> 'approved'
       or v_career.version <> p_expected_career_version
       or v_old_record.version <> p_expected_record_version then
        raise exception using errcode = '40001', message = 'Activity revision conflict';
    end if;

    update public.evidence_records
       set status = 'superseded',
           version = v_old_record.version + 1,
           career_item_snapshot = to_jsonb(v_career),
           updated_at = v_updated_at
     where id = v_old_record.id
       and user_id = v_user_id;

    update public.career_items
       set kind = p_kind,
           title = btrim(p_title),
           organization = nullif(btrim(p_organization), ''),
           role = nullif(btrim(p_role), ''),
           started_at = nullif(btrim(p_started_at), ''),
           ended_at = nullif(btrim(p_ended_at), ''),
           is_current = p_is_current,
           summary = nullif(btrim(p_summary), ''),
           version = v_career.version + 1,
           updated_at = v_updated_at
     where id = v_career.id
       and user_id = v_user_id
     returning * into v_new_career;

    select coalesce(max(e.revision_number), 0) + 1
      into v_revision_number
      from public.evidence_records as e
     where e.user_id = v_user_id
       and e.career_item_id = v_career_item_id;

    insert into public.evidence_records (
        career_item_id, user_id, situation, problem, action, result, learning,
        metrics, skills, competency_tags, status, confidence, version,
        revision_number, revision_of, restored_from_id, career_item_snapshot,
        created_at, updated_at
    ) values (
        v_old_record.career_item_id, v_user_id, v_old_record.situation, v_old_record.problem,
        nullif(btrim(p_action), ''), nullif(btrim(p_result), ''), nullif(btrim(p_learning), ''),
        v_old_record.metrics, v_old_record.skills, v_old_record.competency_tags, 'approved',
        v_old_record.confidence, 1, v_revision_number, v_old_record.id, null,
        to_jsonb(v_new_career), v_updated_at, v_updated_at
    ) returning * into v_new_record;

    return jsonb_build_object(
        'record', to_jsonb(v_new_record),
        'careerItem', to_jsonb(v_new_career),
        'sourceFragmentCount', 0
    );
end;
$$;

create or replace function public.restore_evidence_activity_revision(
    p_current_record_id uuid,
    p_target_record_id uuid,
    p_expected_current_record_version integer,
    p_expected_career_version integer,
    p_expected_target_record_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_career_item_id uuid;
    v_career public.career_items%rowtype;
    v_current_record public.evidence_records%rowtype;
    v_target_record public.evidence_records%rowtype;
    v_new_career public.career_items%rowtype;
    v_new_record public.evidence_records%rowtype;
    v_revision_number integer;
    v_source_count integer;
    v_snapshot jsonb;
    v_updated_at timestamptz := now();
begin
    if v_user_id is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;
    if p_current_record_id is null or p_target_record_id is null
       or p_current_record_id = p_target_record_id
       or p_expected_current_record_version is null or p_expected_current_record_version < 1
       or p_expected_career_version is null or p_expected_career_version < 1
       or p_expected_target_record_version is null or p_expected_target_record_version < 1 then
        raise exception using errcode = '22023', message = 'Invalid activity revision restore';
    end if;

    select e.career_item_id
      into v_career_item_id
      from public.evidence_records as e
     where e.id = p_current_record_id
       and e.user_id = v_user_id;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;

    select c.*
      into v_career
      from public.career_items as c
     where c.id = v_career_item_id
       and c.user_id = v_user_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;

    select e.*
      into v_current_record
      from public.evidence_records as e
     where e.id = p_current_record_id
       and e.user_id = v_user_id
       and e.career_item_id = v_career_item_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;
    select e.*
      into v_target_record
      from public.evidence_records as e
     where e.id = p_target_record_id
       and e.user_id = v_user_id
       and e.career_item_id = v_career_item_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity revision not found';
    end if;
    if v_career.status <> 'approved'
       or v_current_record.status <> 'approved'
       or v_target_record.status <> 'superseded'
       or v_current_record.version <> p_expected_current_record_version
       or v_career.version <> p_expected_career_version
       or v_target_record.version <> p_expected_target_record_version then
        raise exception using errcode = '40001', message = 'Activity revision restore conflict';
    end if;

    v_snapshot := v_target_record.career_item_snapshot;
    if v_snapshot is null
       or v_snapshot->>'id' is distinct from v_career.id::text
       or v_snapshot->>'user_id' is distinct from v_user_id::text
       or v_snapshot->>'kind' is null
       or v_snapshot->>'kind' not in ('project', 'work', 'education', 'credential', 'award', 'leadership', 'community', 'other')
       or coalesce(length(btrim(v_snapshot->>'title')), 0) not between 1 and 200 then
        raise exception using errcode = '22023', message = 'Activity revision has no restorable snapshot';
    end if;

    update public.evidence_records
       set status = 'superseded',
           version = v_current_record.version + 1,
           career_item_snapshot = to_jsonb(v_career),
           updated_at = v_updated_at
     where id = v_current_record.id
       and user_id = v_user_id;

    update public.career_items
       set kind = v_snapshot->>'kind',
           title = v_snapshot->>'title',
           organization = v_snapshot->>'organization',
           role = v_snapshot->>'role',
           started_at = v_snapshot->>'started_at',
           ended_at = v_snapshot->>'ended_at',
           is_current = coalesce((v_snapshot->>'is_current')::boolean, false),
           summary = v_snapshot->>'summary',
           team_size = nullif(v_snapshot->>'team_size', '')::integer,
           contribution_note = v_snapshot->>'contribution_note',
           skills = array(select jsonb_array_elements_text(coalesce(v_snapshot->'skills', '[]'::jsonb))),
           competency_tags = array(select jsonb_array_elements_text(coalesce(v_snapshot->'competency_tags', '[]'::jsonb))),
           version = v_career.version + 1,
           updated_at = v_updated_at
     where id = v_career.id
       and user_id = v_user_id
     returning * into v_new_career;

    select coalesce(max(e.revision_number), 0) + 1
      into v_revision_number
      from public.evidence_records as e
     where e.user_id = v_user_id
       and e.career_item_id = v_career_item_id;

    insert into public.evidence_records (
        career_item_id, user_id, situation, problem, action, result, learning,
        metrics, skills, competency_tags, status, confidence, version,
        revision_number, revision_of, restored_from_id, career_item_snapshot,
        created_at, updated_at
    ) values (
        v_target_record.career_item_id, v_user_id, v_target_record.situation, v_target_record.problem,
        v_target_record.action, v_target_record.result, v_target_record.learning,
        v_target_record.metrics, v_target_record.skills, v_target_record.competency_tags, 'approved',
        v_target_record.confidence, 1, v_revision_number, v_current_record.id, v_target_record.id,
        v_snapshot, v_updated_at, v_updated_at
    ) returning * into v_new_record;

    insert into public.evidence_sources (
        evidence_record_id, source_fragment_id, user_id, claim_type,
        quote_excerpt, is_primary, metadata
    )
    select v_new_record.id, source.source_fragment_id, v_user_id, source.claim_type,
           source.quote_excerpt, source.is_primary, source.metadata
      from public.evidence_sources as source
     where source.evidence_record_id = v_target_record.id
       and source.user_id = v_user_id;

    select count(distinct source_fragment_id)::integer
      into v_source_count
      from public.evidence_sources as source
     where source.evidence_record_id = v_new_record.id
       and source.user_id = v_user_id;

    return jsonb_build_object(
        'record', to_jsonb(v_new_record),
        'careerItem', to_jsonb(v_new_career),
        'sourceFragmentCount', v_source_count
    );
end;
$$;

create or replace function public.set_evidence_activity_status(
    p_record_id uuid,
    p_expected_record_version integer,
    p_expected_career_version integer,
    p_next_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_career_item_id uuid;
    v_career public.career_items%rowtype;
    v_record public.evidence_records%rowtype;
    v_new_career public.career_items%rowtype;
    v_new_record public.evidence_records%rowtype;
    v_expected_status text;
    v_source_count integer;
    v_updated_at timestamptz := now();
begin
    if v_user_id is null then
        raise exception using errcode = '42501', message = 'Authentication required';
    end if;
    if p_record_id is null
       or p_expected_record_version is null or p_expected_record_version < 1
       or p_expected_career_version is null or p_expected_career_version < 1
       or p_next_status is null
       or p_next_status not in ('approved', 'archived') then
        raise exception using errcode = '22023', message = 'Invalid activity status';
    end if;
    v_expected_status := case when p_next_status = 'archived' then 'approved' else 'archived' end;

    select e.career_item_id
      into v_career_item_id
      from public.evidence_records as e
     where e.id = p_record_id
       and e.user_id = v_user_id;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;
    select c.*
      into v_career
      from public.career_items as c
     where c.id = v_career_item_id
       and c.user_id = v_user_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;
    select e.*
      into v_record
      from public.evidence_records as e
     where e.id = p_record_id
       and e.user_id = v_user_id
       and e.career_item_id = v_career_item_id
     for update;
    if not found then
        raise exception using errcode = 'P0002', message = 'Activity not found';
    end if;
    if v_career.status <> v_expected_status or v_record.status <> v_expected_status
       or v_career.version <> p_expected_career_version
       or v_record.version <> p_expected_record_version then
        raise exception using errcode = '40001', message = 'Activity status conflict';
    end if;

    update public.career_items
       set status = p_next_status,
           version = v_career.version + 1,
           updated_at = v_updated_at
     where id = v_career.id and user_id = v_user_id
     returning * into v_new_career;
    update public.evidence_records
       set status = p_next_status,
           version = v_record.version + 1,
           updated_at = v_updated_at
     where id = v_record.id and user_id = v_user_id
     returning * into v_new_record;

    select count(distinct source_fragment_id)::integer
      into v_source_count
      from public.evidence_sources as source
     where source.evidence_record_id = v_record.id
       and source.user_id = v_user_id;

    return jsonb_build_object(
        'record', to_jsonb(v_new_record),
        'careerItem', to_jsonb(v_new_career),
        'sourceFragmentCount', v_source_count
    );
end;
$$;

revoke all on function public.revise_evidence_activity(uuid, integer, integer, text, text, text, text, text, text, boolean, text, text, text, text) from public, anon;
revoke all on function public.restore_evidence_activity_revision(uuid, uuid, integer, integer, integer) from public, anon;
revoke all on function public.set_evidence_activity_status(uuid, integer, integer, text) from public, anon;
grant execute on function public.revise_evidence_activity(uuid, integer, integer, text, text, text, text, text, text, boolean, text, text, text, text) to authenticated;
grant execute on function public.restore_evidence_activity_revision(uuid, uuid, integer, integer, integer) to authenticated;
grant execute on function public.set_evidence_activity_status(uuid, integer, integer, text) to authenticated;
