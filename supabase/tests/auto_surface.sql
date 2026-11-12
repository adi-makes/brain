begin;

select plan(50);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, email_change_confirm_status, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'a@example.test',
    extensions.crypt('password-a', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', '', '', 0, false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'b@example.test',
    extensions.crypt('password-b', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', '', '', 0, false, false
  );

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$ select section, reason, excluded_reason from public.surface_decision('open', 'critical', date '2026-11-19', date '2026-11-12', false, false, false) $$,
  $$ select 'upcoming'::text, 'Due soon'::text, null::text $$,
  'critical work surfaces seven days before it is due'
);

select results_eq(
  $$ select section, excluded_reason from public.surface_decision('open', 'critical', date '2026-11-20', date '2026-11-12', false, false, false) $$,
  $$ select 'todo'::text, 'Outside the severity window'::text $$,
  'critical work stays off the surfaced lists eight days out'
);

select results_eq(
  $$ select section, reason from public.surface_decision('open', 'critical', date '2026-11-12', date '2026-11-12', false, false, false) $$,
  $$ select 'today'::text, 'Due today'::text $$,
  'the due date itself is today'
);

select results_eq(
  $$ select section, reason from public.surface_decision('open', 'high', date '2026-11-11', date '2026-11-12', false, false, false) $$,
  $$ select 'today'::text, 'Overdue'::text $$,
  'an open high item before today is overdue'
);

select results_eq(
  $$ select section, reason from public.surface_decision('open', 'high', date '2026-11-15', date '2026-11-12', false, false, false) $$,
  $$ select 'upcoming'::text, 'Due soon'::text $$,
  'high work surfaces three days before it is due'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'high', date '2026-11-16', date '2026-11-12', false, false, false) $$,
  $$ select 'Outside the severity window'::text $$,
  'high work is outside the window on the fourth day'
);

select results_eq(
  $$ select section, reason from public.surface_decision('open', 'medium', date '2026-11-13', date '2026-11-12', false, false, false) $$,
  $$ select 'upcoming'::text, 'Due soon'::text $$,
  'medium work surfaces one day before it is due'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'medium', date '2026-11-14', date '2026-11-12', false, false, false) $$,
  $$ select 'Outside the severity window'::text $$,
  'medium work is outside the window two days out'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'low', date '2026-11-12', date '2026-11-12', false, false, false) $$,
  $$ select 'Low severity does not surface on its own'::text $$,
  'low work does not surface on the due date'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'low', date '2026-11-01', date '2026-11-12', false, false, false) $$,
  $$ select 'Low severity does not surface on its own'::text $$,
  'low work does not surface when it is overdue'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'critical', null, date '2026-11-12', false, false, false) $$,
  $$ select 'No due date'::text $$,
  'a critical item with no due date is not surfaced'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('done', 'critical', date '2026-11-12', date '2026-11-12', false, false, false) $$,
  $$ select 'Completed'::text $$,
  'completed work leaves the surfaced lists'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('cancelled', 'critical', date '2026-11-12', date '2026-11-12', false, false, false) $$,
  $$ select 'Cancelled'::text $$,
  'cancelled work leaves the surfaced lists'
);

select results_eq(
  $$ select excluded_reason from public.surface_decision('open', 'critical', date '2026-11-11', date '2026-11-12', true, true, false) $$,
  $$ select 'Dismissed'::text $$,
  'dismissal wins over a pin and over the overdue window'
);

select results_eq(
  $$ select section, reason from public.surface_decision('open', 'low', null, date '2026-11-12', false, true, false) $$,
  $$ select 'today'::text, 'Manually pinned'::text $$,
  'a pin puts low work with no due date on today'
);

select is(
  public.work_item_local_due(null, timestamptz '2026-11-12 20:00:00+00', 'Asia/Kolkata'),
  date '2026-11-13',
  '20:00 UTC is the next calendar day in Kolkata'
);

select is(
  public.work_item_local_due(null, timestamptz '2026-11-12 20:00:00+00', 'UTC'),
  date '2026-11-12',
  'the same instant is still 12 November in UTC'
);

select is(
  public.work_item_local_due(null, timestamptz '2026-03-08 04:30:00+00', 'America/New_York'),
  date '2026-03-07',
  'before the spring-forward the New York date is still 7 March'
);

select is(
  public.work_item_local_due(null, timestamptz '2026-03-08 07:30:00+00', 'America/New_York'),
  date '2026-03-08',
  'after the spring-forward the New York date is 8 March'
);

select lives_ok(
  $$ select public.create_work_item('Window', '', 'work', 'critical', '2026-11-12', null, null, 'idem-surf-window') $$,
  'creates one canonical work item'
);

select results_eq(
  $$ select count(*)::int from public.work_items where title = 'Window' $$,
  $$ select 1 $$,
  'surfacing does not create a second task row'
);

select ok(
  not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name in ('today_items', 'upcoming_items', 'todos', 'tasks')
  ),
  'today, upcoming, and to-do are not tables'
);

do $$
begin
  perform public.reconcile_auto_surface(timestamptz '2026-11-12 12:00:00+00');
end $$;

create temp table surface_snap as
select version, eligibility_signature, dismissed_at, current_eligibility
from public.auto_surface_states
where work_item_id = (select id from public.work_items where title = 'Window');

do $$
begin
  perform public.reconcile_auto_surface(timestamptz '2026-11-12 12:00:00+00');
end $$;

select results_eq(
  $$
    select version, eligibility_signature, dismissed_at, current_eligibility
    from public.auto_surface_states
    where work_item_id = (select id from public.work_items where title = 'Window')
  $$,
  $$ select version, eligibility_signature, dismissed_at, current_eligibility from surface_snap $$,
  'a second reconciliation does not write'
);

select is(
  (
    select item->>'surface_reason'
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Window'
  ),
  'Due today',
  'the projection says why the item is on today'
);

create temp table window_version as
select version
from public.auto_surface_states
where work_item_id = (select id from public.work_items where title = 'Window');

select lives_ok(
  $$
    select public.dismiss_work_surface(
      (select id from public.work_items where title = 'Window'),
      (select version from window_version),
      'idem-surf-dismiss'
    )
  $$,
  'dismisses the canonical item'
);

do $$
begin
  perform public.dismiss_work_surface(
    (select id from public.work_items where title = 'Window'),
    (select version from window_version),
    'idem-surf-dismiss'
  );
end $$;

select is(
  (select count(*)::int from public.operation_journal where entity_type = 'auto_surface_state'),
  1,
  'replaying a dismiss does not write a second audit row'
);

select is(
  (
    select item->>'excluded_reason'
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Window'
  ),
  'Dismissed',
  'a dismissed item stays off today'
);

create temp table dismiss_snap as
select dismissed_at, eligibility_signature
from public.auto_surface_states
where work_item_id = (select id from public.work_items where title = 'Window');

do $$
begin
  perform public.reconcile_auto_surface(timestamptz '2026-11-12 12:00:00+00');
  perform public.reconcile_auto_surface(timestamptz '2026-11-13 12:00:00+00');
end $$;

select results_eq(
  $$
    select dismissed_at, eligibility_signature
    from public.auto_surface_states
    where work_item_id = (select id from public.work_items where title = 'Window')
  $$,
  $$ select dismissed_at, eligibility_signature from dismiss_snap $$,
  'reconciliation does not resurrect or rewrite a dismissal'
);

select lives_ok(
  $$
    select public.update_work_item(
      (select id from public.work_items where title = 'Window'),
      (select version from public.work_items where title = 'Window'),
      'Window', '', 'work', 'low', '2026-12-20', null, null, 'idem-surf-retarget'
    )
  $$,
  'changes the due date and severity of a dismissed item'
);

select results_eq(
  $$
    select eligibility_signature, dismissed_at is not null
    from public.auto_surface_states
    where work_item_id = (select id from public.work_items where title = 'Window')
  $$,
  $$ select eligibility_signature, true from dismiss_snap $$,
  'a due-date change keeps the dismissal and its signature'
);

select is(
  (
    select current_eligibility
    from public.auto_surface_states
    where work_item_id = (select id from public.work_items where title = 'Window')
  ),
  'todo|Low severity does not surface on its own',
  'eligibility is recalculated from the new severity'
);

select lives_ok(
  $$
    select public.restore_work_surface(
      (select id from public.work_items where title = 'Window'),
      (select version from public.auto_surface_states where work_item_id = (select id from public.work_items where title = 'Window')),
      'idem-surf-restore'
    )
  $$,
  'restores the item without deleting the state row'
);

select is(
  (select count(*)::int from public.auto_surface_states where work_item_id = (select id from public.work_items where title = 'Window')),
  1,
  'restore keeps the same state row'
);

select throws_ok(
  $$
    select public.dismiss_work_surface(
      (select id from public.work_items where title = 'Window'),
      1,
      'idem-surf-stale'
    )
  $$,
  'P0002',
  'version conflict',
  'a stale surface version does not overwrite a newer dismissal state'
);

select lives_ok(
  $$ select public.create_work_item('Quiet', '', 'home', 'low', '2026-11-12', null, null, 'idem-surf-low') $$,
  'creates a low item'
);

select lives_ok(
  $$
    select public.pin_work_surface(
      (select id from public.work_items where title = 'Quiet'),
      (select version from public.auto_surface_states where work_item_id = (select id from public.work_items where title = 'Quiet')),
      'idem-surf-pin'
    )
  $$,
  'pins the low item'
);

select is(
  (
    select item->>'surface_reason'
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Quiet'
  ),
  'Manually pinned',
  'the projection explains the pin'
);

select lives_ok(
  $$ select public.create_work_item('Finished', '', 'home', 'high', '2026-11-12', null, null, 'idem-surf-done') $$,
  'creates an item to complete'
);

select lives_ok(
  $$
    select public.set_work_item_status(
      (select id from public.work_items where title = 'Finished'),
      1,
      'done',
      'idem-surf-mark-done'
    )
  $$,
  'marks the item done'
);

select is(
  (
    select item->>'excluded_reason'
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Finished'
  ),
  'Completed',
  'completed work is excluded from today'
);

select lives_ok(
  $$ select public.create_work_item('Dropped', '', 'home', 'high', '2026-11-12', null, null, 'idem-surf-cancel') $$,
  'creates an item to cancel'
);

select lives_ok(
  $$
    select public.set_work_item_status(
      (select id from public.work_items where title = 'Dropped'),
      1,
      'cancelled',
      'idem-surf-mark-cancel'
    )
  $$,
  'cancels the item'
);

select is(
  (
    select item->>'excluded_reason'
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Dropped'
  ),
  'Cancelled',
  'cancelled work is excluded from today'
);

select lives_ok(
  $$ select public.create_work_item('Gone', '', 'home', 'high', '2026-11-11', null, null, 'idem-surf-delete') $$,
  'creates an item to delete'
);

select lives_ok(
  $$
    select public.soft_delete_work_item(
      (select id from public.work_items where title = 'Gone'),
      1,
      'idem-surf-soft-delete'
    )
  $$,
  'soft-deletes the item'
);

select is(
  (
    select count(*)::int
    from jsonb_array_elements(public.list_work_projections(timestamptz '2026-11-12 12:00:00+00')->'items') item
    where item->>'title' = 'Gone'
  ),
  0,
  'a deleted work item leaves the projection'
);

select is(
  (select count(*)::int from public.auto_surface_states where work_item_id = (select id from public.work_items where title = 'Gone')),
  1,
  'deleting the work item does not delete its surface state'
);

select results_eq(
  $$ select count(*)::int from public.work_items where title in ('Window', 'Quiet', 'Finished', 'Dropped', 'Gone') $$,
  $$ select 5 $$,
  'dismiss, pin, completion, and delete did not copy the tasks'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.dismiss_work_surface(
      (select id from public.work_items where title = 'Quiet'),
      1,
      'idem-surf-other-user'
    )
  $$,
  'P0004',
  'not found',
  'another user cannot dismiss this work item'
);

reset role;

create temp table schedule_snap as
select work_item_id, version, dismissed_at, eligibility_signature, pinned_at
from public.auto_surface_states;

do $$
begin
  perform public.reconcile_auto_surface_all(timestamptz '2026-11-12 12:00:00+00');
  perform public.reconcile_auto_surface_all(timestamptz '2026-11-12 12:00:00+00');
end $$;

select results_eq(
  $$
    select work_item_id, version, dismissed_at, eligibility_signature, pinned_at
    from public.auto_surface_states
    order by work_item_id
  $$,
  $$
    select work_item_id, version, dismissed_at, eligibility_signature, pinned_at
    from schedule_snap
    order by work_item_id
  $$,
  'the scheduled reconciliation is idempotent and keeps dismissal history'
);

select * from finish();

rollback;
