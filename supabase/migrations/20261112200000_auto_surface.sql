-- Projections of work_items. Today, Upcoming, and To-Do are not tables.
-- Eligibility is calculated here. Callers display the result.

alter table public.auto_surface_states
  add column pinned_at timestamptz,
  add column current_eligibility text not null default '',
  add column last_reconciled_at timestamptz,
  add constraint auto_surface_eligibility_len check (char_length(current_eligibility) <= 200);

create index work_items_open_surface_idx
  on public.work_items (owner_id, status, due_on)
  where deleted_at is null;

create or replace function public.surface_lead_days(p_severity text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_severity
    when 'critical' then 7
    when 'high' then 3
    when 'medium' then 1
    else null
  end;
$$;

create or replace function public.work_item_local_due(
  p_due_on date,
  p_due_at timestamptz,
  p_timezone text
)
returns date
language plpgsql
stable
set search_path = public
as $$
begin
  if p_due_on is not null then
    return p_due_on;
  end if;
  if p_due_at is null then
    return null;
  end if;
  begin
    return (p_due_at at time zone p_timezone)::date;
  exception
    when invalid_parameter_value then
      return (p_due_at at time zone 'UTC')::date;
  end;
end;
$$;

create or replace function public.surface_flags(
  p_dismissed_at timestamptz,
  p_restored_at timestamptz,
  p_pinned_at timestamptz
)
returns table (dismissed boolean, pinned boolean)
language sql
immutable
set search_path = public
as $$
  select
    p_dismissed_at is not null
      and (p_restored_at is null or p_dismissed_at > p_restored_at)
      and (p_pinned_at is null or p_dismissed_at > p_pinned_at),
    p_pinned_at is not null
      and not (
        p_dismissed_at is not null
          and (p_restored_at is null or p_dismissed_at > p_restored_at)
          and (p_pinned_at is null or p_dismissed_at > p_pinned_at)
      );
$$;

create or replace function public.surface_decision(
  p_status text,
  p_severity text,
  p_local_due date,
  p_today date,
  p_dismissed boolean,
  p_pinned boolean,
  p_deleted boolean
)
returns table (section text, reason text, excluded_reason text)
language plpgsql
immutable
set search_path = public
as $$
declare
  lead_days integer := public.surface_lead_days(p_severity);
  days_until integer;
begin
  if p_deleted then
    return query select 'todo', null::text, 'Deleted';
    return;
  end if;
  if p_status = 'done' then
    return query select 'todo', null::text, 'Completed';
    return;
  end if;
  if p_status = 'cancelled' then
    return query select 'todo', null::text, 'Cancelled';
    return;
  end if;
  if p_dismissed then
    return query select 'todo', null::text, 'Dismissed';
    return;
  end if;
  if p_pinned and p_status = 'open' then
    return query select 'today', 'Manually pinned', null::text;
    return;
  end if;
  if p_status <> 'open' then
    return query select 'todo', null::text, 'Not open';
    return;
  end if;
  if p_local_due is null then
    return query select 'todo', null::text, 'No due date';
    return;
  end if;
  if lead_days is null then
    return query select 'todo', null::text, 'Low severity does not surface on its own';
    return;
  end if;
  days_until := p_local_due - p_today;
  if days_until > lead_days then
    return query select 'todo', null::text, 'Outside the severity window';
    return;
  end if;
  if days_until < 0 then
    return query select 'today', 'Overdue', null::text;
    return;
  end if;
  if days_until = 0 then
    return query select 'today', 'Due today', null::text;
    return;
  end if;
  return query select 'upcoming', 'Due soon', null::text;
end;
$$;

create or replace function public.surface_signature(
  p_severity text,
  p_due_on date,
  p_due_at timestamptz,
  p_status text
)
returns text
language sql
immutable
set search_path = public
as $$
  select concat_ws('|', p_severity, coalesce(p_due_on::text, ''), coalesce(p_due_at::text, ''), p_status);
$$;

create or replace function public.reconcile_work_item_surface(
  p_owner uuid,
  p_id uuid,
  p_as_of timestamptz
)
returns void
language plpgsql
set search_path = public
as $$
declare
  actor text := current_user;
  zone text;
  today_on date;
  item public.work_items%rowtype;
  eligibility text;
begin
  if auth.uid() is distinct from p_owner and actor not in ('postgres', 'supabase_admin') then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_as_of is null then
    p_as_of := now();
  end if;
  select * into item
  from public.work_items
  where owner_id = p_owner and id = p_id;
  if not found then
    return;
  end if;
  select coalesce(timezone, 'UTC') into zone
  from public.profiles
  where id = p_owner;
  zone := coalesce(zone, 'UTC');
  today_on := (p_as_of at time zone zone)::date;
  select d.section || '|' || coalesce(d.reason, d.excluded_reason, '')
  into eligibility
  from public.surface_decision(
    item.status,
    item.severity,
    public.work_item_local_due(item.due_on, item.due_at, zone),
    today_on,
    false,
    false,
    item.deleted_at is not null
  ) d;

  insert into public.auto_surface_states as state (
    owner_id, work_item_id, current_eligibility, last_reconciled_at
  )
  values (p_owner, p_id, eligibility, p_as_of)
  on conflict (owner_id, work_item_id) do update
  set current_eligibility = excluded.current_eligibility,
      last_reconciled_at = excluded.last_reconciled_at
  where state.current_eligibility is distinct from excluded.current_eligibility;
end;
$$;

create or replace function public.touch_work_item_surface()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.reconcile_work_item_surface(new.owner_id, new.id, now());
  return new;
end;
$$;

create trigger work_items_surface
  after insert or update on public.work_items
  for each row execute function public.touch_work_item_surface();

create or replace function public.reconcile_auto_surface(p_as_of timestamptz default now())
returns integer
language plpgsql
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  item_id uuid;
  changed integer := 0;
begin
  if owner is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_as_of is null then
    p_as_of := now();
  end if;
  for item_id in
    select id from public.work_items where owner_id = owner
  loop
    perform public.reconcile_work_item_surface(owner, item_id, p_as_of);
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

create or replace function public.reconcile_auto_surface_all(p_as_of timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  changed integer := 0;
begin
  if p_as_of is null then
    p_as_of := now();
  end if;
  for rec in select owner_id, id from public.work_items
  loop
    perform public.reconcile_work_item_surface(rec.owner_id, rec.id, p_as_of);
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

create or replace function public.list_work_projections(p_as_of timestamptz default now())
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  zone text;
  today_on date;
  payload jsonb;
  total integer;
begin
  if owner is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_as_of is null then
    p_as_of := now();
  end if;
  perform public.reconcile_auto_surface(p_as_of);
  select coalesce(timezone, 'UTC') into zone from public.profiles where id = owner;
  zone := coalesce(zone, 'UTC');
  today_on := (p_as_of at time zone zone)::date;
  select count(*) into total
  from public.work_items
  where owner_id = owner and deleted_at is null;

  with ranked as (
    select
      w.*,
      s.version as surface_version,
      s.eligibility_signature,
      s.dismissed_at,
      s.restored_at,
      s.pinned_at,
      s.current_eligibility,
      flags.dismissed,
      flags.pinned,
      decision.section,
      decision.reason,
      decision.excluded_reason,
      public.work_item_local_due(w.due_on, w.due_at, zone) as local_due
    from public.work_items w
    left join public.auto_surface_states s
      on s.owner_id = w.owner_id and s.work_item_id = w.id
    cross join lateral public.surface_flags(s.dismissed_at, s.restored_at, s.pinned_at) flags
    cross join lateral public.surface_decision(
      w.status,
      w.severity,
      public.work_item_local_due(w.due_on, w.due_at, zone),
      today_on,
      flags.dismissed,
      flags.pinned,
      false
    ) decision
    where w.owner_id = owner and w.deleted_at is null
    order by
      case decision.section when 'today' then 0 when 'upcoming' then 1 else 2 end,
      public.work_item_local_due(w.due_on, w.due_at, zone) nulls last,
      w.created_at desc,
      w.id
    limit 500
  )
  select coalesce(jsonb_agg(
    to_jsonb(ranked) || jsonb_build_object(
      'surface_section', ranked.section,
      'surface_reason', ranked.reason,
      'excluded_reason', ranked.excluded_reason,
      'surface_dismissed', ranked.dismissed,
      'surface_pinned', ranked.pinned
    )
    order by
      case ranked.section when 'today' then 0 when 'upcoming' then 1 else 2 end,
      ranked.local_due nulls last,
      ranked.created_at desc,
      ranked.id
  ), '[]'::jsonb)
  into payload
  from ranked;

  return jsonb_build_object(
    'items', payload,
    'time_zone', zone,
    'today_on', today_on,
    'truncated', total > 500
  );
end;
$$;

create or replace function public.audit_surface(
  p_work_item_id uuid,
  p_before jsonb,
  p_after jsonb,
  p_version integer
)
returns void
language plpgsql
set search_path = public
as $$
declare
  owner uuid := auth.uid();
begin
  insert into public.operation_journal (
    owner_id, entity_type, entity_id, before_snapshot, after_snapshot, version_after
  )
  values (owner, 'auto_surface_state', p_work_item_id, p_before, p_after, p_version);
end;
$$;

create or replace function public.apply_surface_action(
  p_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_action text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  owner uuid := auth.uid();
  hash text;
  replay jsonb;
  item public.work_items%rowtype;
  state public.auto_surface_states%rowtype;
  before_state jsonb;
  updated public.auto_surface_states%rowtype;
  response jsonb;
begin
  if owner is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_action not in ('dismiss', 'restore', 'pin', 'unpin') then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  hash := md5(concat_ws('|', 'surface', p_action, p_id::text, p_expected_version::text));
  replay := public.take_idempotency(p_idempotency_key, hash);
  if replay is not null then
    return replay;
  end if;

  select * into item
  from public.work_items
  where id = p_id and owner_id = owner and deleted_at is null
  for update;
  if not found then
    raise exception 'not found' using errcode = 'P0004';
  end if;

  select * into state
  from public.auto_surface_states
  where owner_id = owner and work_item_id = p_id
  for update;
  if not found then
    if p_expected_version <> 0 then
      raise exception 'version conflict' using errcode = 'P0002';
    end if;
    insert into public.auto_surface_states (owner_id, work_item_id)
    values (owner, p_id)
    returning * into state;
  elsif state.version <> p_expected_version then
    raise exception 'version conflict' using errcode = 'P0002';
  end if;

  before_state := to_jsonb(state);
  if p_action = 'dismiss' then
    update public.auto_surface_states
    set dismissed_at = now(),
        eligibility_signature = public.surface_signature(item.severity, item.due_on, item.due_at, item.status)
    where owner_id = owner and work_item_id = p_id
    returning * into updated;
  elsif p_action = 'restore' then
    update public.auto_surface_states
    set restored_at = now()
    where owner_id = owner and work_item_id = p_id
    returning * into updated;
  elsif p_action = 'pin' then
    update public.auto_surface_states
    set pinned_at = now()
    where owner_id = owner and work_item_id = p_id
    returning * into updated;
  else
    update public.auto_surface_states
    set pinned_at = null
    where owner_id = owner and work_item_id = p_id
    returning * into updated;
  end if;

  perform public.audit_surface(p_id, before_state, to_jsonb(updated), updated.version);
  response := jsonb_build_object('auto_surface_state', to_jsonb(updated), 'work_item_id', p_id);
  perform public.finish_idempotency(p_idempotency_key, 'auto_surface_state', p_id, response);
  return response;
end;
$$;

create or replace function public.dismiss_work_surface(
  p_id uuid,
  p_expected_version integer,
  p_idempotency_key text
)
returns jsonb
language sql
set search_path = public
as $$
  select public.apply_surface_action(p_id, p_expected_version, p_idempotency_key, 'dismiss');
$$;

create or replace function public.restore_work_surface(
  p_id uuid,
  p_expected_version integer,
  p_idempotency_key text
)
returns jsonb
language sql
set search_path = public
as $$
  select public.apply_surface_action(p_id, p_expected_version, p_idempotency_key, 'restore');
$$;

create or replace function public.pin_work_surface(
  p_id uuid,
  p_expected_version integer,
  p_idempotency_key text
)
returns jsonb
language sql
set search_path = public
as $$
  select public.apply_surface_action(p_id, p_expected_version, p_idempotency_key, 'pin');
$$;

create or replace function public.unpin_work_surface(
  p_id uuid,
  p_expected_version integer,
  p_idempotency_key text
)
returns jsonb
language sql
set search_path = public
as $$
  select public.apply_surface_action(p_id, p_expected_version, p_idempotency_key, 'unpin');
$$;

revoke all on function public.reconcile_auto_surface_all(timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_auto_surface_all(timestamptz) to service_role;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'surface_lead_days',
        'work_item_local_due',
        'surface_flags',
        'surface_decision',
        'surface_signature',
        'reconcile_work_item_surface',
        'touch_work_item_surface',
        'reconcile_auto_surface',
        'list_work_projections',
        'audit_surface',
        'apply_surface_action',
        'dismiss_work_surface',
        'restore_work_surface',
        'pin_work_surface',
        'unpin_work_surface'
      )
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
