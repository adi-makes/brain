-- Planning preferences and approved planning blocks.
-- The Python planner chooses the times. This migration only stores them and
-- rejects stale versions or overlaps. It does not search for a slot.
-- Design: docs/architecture/planner.md

create extension if not exists btree_gist;

alter table public.planning_blocks
  add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  add column source text not null default 'user' check (source in ('planner', 'user')),
  add column proposal_id uuid;

alter table public.planning_blocks
  add constraint planning_blocks_no_overlap
  exclude using gist (
    owner_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'active' and deleted_at is null);

create table public.planning_preferences (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  working_days smallint[] not null default '{0,1,2,3,4}',
  work_start time not null default '09:00',
  work_end time not null default '17:00',
  break_start time not null default '12:00',
  break_minutes integer not null default 30 check (break_minutes between 0 and 180),
  preferred_start time not null default '09:00',
  preferred_end time not null default '12:00',
  daily_load_minutes integer not null default 240 check (daily_load_minutes between 15 and 1440),
  safety_lead_days integer not null default 1 check (safety_lead_days between 0 and 30),
  protected jsonb not null default '[]'::jsonb check (jsonb_typeof(protected) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint planning_preferences_days check (
    cardinality(working_days) > 0
    and working_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  )
);

revoke all on table public.planning_preferences from public, anon;
grant select, insert, update, delete on table public.planning_preferences to authenticated;
grant all on table public.planning_preferences to service_role;
alter table public.planning_preferences enable row level security;
alter table public.planning_preferences force row level security;

create policy planning_preferences_select on public.planning_preferences
  for select to authenticated
  using (owner_id = (select auth.uid()));
create policy planning_preferences_insert on public.planning_preferences
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy planning_preferences_update on public.planning_preferences
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy planning_preferences_delete on public.planning_preferences
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create trigger planning_preferences_touch
  before update on public.planning_preferences
  for each row execute function public.touch_row();
create trigger planning_preferences_owner
  before update on public.planning_preferences
  for each row execute function public.prevent_owner_change();

create or replace function public.apply_planning_proposal(
  p_work_item_id uuid,
  p_expected_version integer,
  p_proposal_id uuid,
  p_payload_hash text,
  p_timezone text,
  p_blocks jsonb,
  p_event_versions jsonb,
  p_block_versions jsonb,
  p_effort_versions jsonb,
  p_preferences_version integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  zone text;
  item public.work_items%rowtype;
  pref_version integer;
  hash text;
  replay jsonb;
  response jsonb;
begin
  if owner is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  zone := public.require_zone(p_timezone);
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) = 0 then
    raise exception 'invalid block' using errcode = '22023';
  end if;
  p_event_versions := coalesce(p_event_versions, '[]'::jsonb);
  p_block_versions := coalesce(p_block_versions, '[]'::jsonb);
  p_effort_versions := coalesce(p_effort_versions, '[]'::jsonb);

  hash := md5(concat_ws(
    '|', 'apply_plan', p_work_item_id::text, p_expected_version::text, p_proposal_id::text,
    p_payload_hash, zone, p_blocks::text, p_event_versions::text, p_block_versions::text,
    p_effort_versions::text, p_preferences_version::text
  ));
  replay := public.take_idempotency(p_idempotency_key, hash);
  if replay is not null then
    return replay;
  end if;

  select * into item
  from public.work_items
  where id = p_work_item_id and owner_id = owner and deleted_at is null
  for update;
  if not found then
    raise exception 'not found' using errcode = 'P0004';
  end if;
  if item.version <> p_expected_version then
    raise exception 'version conflict' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_event_versions) as v(id uuid, version integer)
    left join public.events event_row on event_row.id = v.id and event_row.owner_id = owner
    where event_row.id is null or event_row.deleted_at is not null or event_row.version <> v.version
  ) or exists (
    select 1
    from jsonb_to_recordset(p_block_versions) as v(id uuid, version integer)
    left join public.planning_blocks block_row
      on block_row.id = v.id and block_row.owner_id = owner
    where block_row.id is null or block_row.deleted_at is not null or block_row.version <> v.version
  ) or exists (
    select 1
    from jsonb_to_recordset(p_effort_versions) as v(id uuid, version integer)
    left join public.task_effort_logs effort_row
      on effort_row.id = v.id and effort_row.owner_id = owner
    where effort_row.id is null or effort_row.version <> v.version
  ) then
    raise exception 'version conflict' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.planning_blocks block_row
    where block_row.owner_id = owner
      and block_row.deleted_at is null
      and not exists (
        select 1
        from jsonb_to_recordset(p_block_versions) as v(id uuid, version integer)
        where v.id = block_row.id
      )
  ) or exists (
    select 1
    from public.task_effort_logs effort_row
    where effort_row.owner_id = owner
      and effort_row.work_item_id = p_work_item_id
      and not exists (
        select 1
        from jsonb_to_recordset(p_effort_versions) as v(id uuid, version integer)
        where v.id = effort_row.id
      )
  ) then
    raise exception 'version conflict' using errcode = 'P0002';
  end if;

  select preferences.version into pref_version
  from public.planning_preferences preferences
  where preferences.owner_id = owner;
  if p_preferences_version = 0 then
    if found then
      raise exception 'version conflict' using errcode = 'P0002';
    end if;
  elsif not found or pref_version <> p_preferences_version then
    raise exception 'version conflict' using errcode = 'P0002';
  end if;

  if exists (
    with incoming as (
      select
        (value ->> 'starts_at')::timestamptz as starts_at,
        (value ->> 'ends_at')::timestamptz as ends_at,
        ordinality
      from jsonb_array_elements(p_blocks) with ordinality
    )
    select 1
    from incoming first_block
    join incoming second_block on first_block.ordinality < second_block.ordinality
    where first_block.starts_at < second_block.ends_at
      and second_block.starts_at < first_block.ends_at
  ) then
    raise exception 'planning conflict' using errcode = 'P0005';
  end if;

  if exists (
    with incoming as (
      select
        (value ->> 'starts_at')::timestamptz as starts_at,
        (value ->> 'ends_at')::timestamptz as ends_at
      from jsonb_array_elements(p_blocks)
    )
    select 1
    from incoming block
    join public.events event_row
      on event_row.owner_id = owner and event_row.deleted_at is null
    where (
        event_row.all_day
        and (block.starts_at at time zone zone)::date between event_row.starts_on and event_row.ends_on
      )
      or (
        not event_row.all_day
        and event_row.starts_at < block.ends_at
        and block.starts_at < event_row.ends_at
      )
    union all
    select 1
    from incoming block
    join public.planning_blocks existing
      on existing.owner_id = owner
      and existing.deleted_at is null
      and existing.status = 'active'
      and existing.starts_at < block.ends_at
      and block.starts_at < existing.ends_at
  ) then
    raise exception 'planning conflict' using errcode = 'P0005';
  end if;

  insert into public.planning_blocks (
    owner_id, work_item_id, starts_at, ends_at, status, timezone, source, proposal_id
  )
  select
    owner,
    p_work_item_id,
    (value ->> 'starts_at')::timestamptz,
    (value ->> 'ends_at')::timestamptz,
    'active',
    zone,
    'planner',
    p_proposal_id
  from jsonb_array_elements(p_blocks)
  where (value ->> 'ends_at')::timestamptz > (value ->> 'starts_at')::timestamptz;

  if (select count(*) from jsonb_array_elements(p_blocks)) <> (
    select count(*) from public.planning_blocks where owner_id = owner and proposal_id = p_proposal_id
  ) then
    raise exception 'invalid block' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', block_row.id,
    'starts_at', block_row.starts_at,
    'ends_at', block_row.ends_at,
    'version', block_row.version
  ) order by block_row.starts_at, block_row.id), '[]'::jsonb)
  into response
  from public.planning_blocks block_row
  where block_row.owner_id = owner and block_row.proposal_id = p_proposal_id;

  response := jsonb_build_object('proposal_id', p_proposal_id, 'blocks', response);
  perform public.finish_idempotency(p_idempotency_key, 'planning_proposal', p_proposal_id, response);
  return response;
exception
  when exclusion_violation then
    raise exception 'planning conflict' using errcode = 'P0005';
end;
$$;

revoke all on function public.apply_planning_proposal(
  uuid, integer, uuid, text, text, jsonb, jsonb, jsonb, jsonb, integer, text
) from public, anon;
grant execute on function public.apply_planning_proposal(
  uuid, integer, uuid, text, text, jsonb, jsonb, jsonb, jsonb, integer, text
) to authenticated;
