begin;

select plan(27);

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

select lives_ok(
  $$ select public.create_work_item('Alpha', 'body', 'personal', 'low', '2026-11-12', null, 30, 'idem-alpha-01') $$,
  'creates a work item'
);

select results_eq(
  $$ select count(*)::int from public.work_items where deleted_at is null and title = 'Alpha' $$,
  $$ select 1 $$,
  'one work item exists after the first create'
);

select results_eq(
  $$
    select (public.create_work_item(
      'Alpha', 'body', 'personal', 'low', '2026-11-12', null, 30, 'idem-alpha-01'
    )->'work_item'->>'id')
  $$,
  $$ select id::text from public.work_items where title = 'Alpha' $$,
  'the same idempotency key returns the original work item'
);

select throws_ok(
  $$ select public.create_work_item('Alpha changed', 'body', 'personal', 'low', null, null, null, 'idem-alpha-01') $$,
  'P0003',
  'idempotency key reused',
  'a reused key with a different request is rejected'
);

select throws_ok(
  $$
    select public.update_work_item(
      (select id from public.work_items where title = 'Alpha'),
      99, 'Alpha', 'body', 'personal', 'high', null, null, null, 'idem-alpha-02'
    )
  $$,
  'P0002',
  'version conflict',
  'a stale version does not overwrite the work item'
);

select lives_ok(
  $$
    select public.update_work_item(
      (select id from public.work_items where title = 'Alpha'),
      1, 'Alpha revised', 'body', 'home', 'high', null, null, 45, 'idem-alpha-03'
    )
  $$,
  'the current version updates the work item'
);

select lives_ok(
  $$
    select public.soft_delete_work_item(
      (select id from public.work_items where title = 'Alpha revised'),
      2,
      'idem-alpha-04'
    )
  $$,
  'soft-deletes the work item'
);

select results_eq(
  $$ select jsonb_array_length(public.list_work_items(20, null, null, null)->'items') $$,
  $$ select 0 $$,
  'a soft-deleted work item is not listed'
);

select lives_ok(
  $$
    select public.create_event(
      'Standup', 'daily', 'work', false, '2026-03-07', null, '09:00', '09:30',
      'America/New_York', 'Library', 'daily', 1, '2026-03-09', null, 'idem-dst-0001'
    )
  $$,
  'creates a daily series across the March daylight-saving change'
);

select results_eq(
  $$
    select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI')
    from public.events
    where title = 'Standup'
    order by occurrence_on
  $$,
  $$ values ('2026-03-07 14:00'), ('2026-03-08 13:00'), ('2026-03-09 13:00') $$,
  'local 09:00 stays 09:00 while the UTC offset changes'
);

select results_eq(
  $$ select count(*)::int from public.events where title = 'Standup' $$,
  $$ select 3 $$,
  'each series date has one event'
);

select lives_ok(
  $$
    select public.materialize_series((
      select series_id from public.events where title = 'Standup' limit 1
    ), 'Standup', 'daily', 'work', 'Library')
  $$,
  'materializing the series again is safe'
);

select results_eq(
  $$ select count(*)::int from public.events where title = 'Standup' $$,
  $$ select 3 $$,
  'a second materialize does not duplicate occurrence identity'
);

select lives_ok(
  $$
    select public.create_event(
      'Week', '', 'home', true, '2026-11-02', '2026-11-02', null, null,
      'UTC', '', 'weekly', 1, null, 3, 'idem-week-0001'
    )
  $$,
  'creates three weekly all-day occurrences'
);

select lives_ok(
  $$
    select public.update_event(
      (select id from public.events where title = 'Week' and occurrence_on = '2026-11-09'),
      1, 'following', 'Later', '', 'home', true, '2026-11-09', '2026-11-09',
      null, null, 'UTC', '', 'idem-week-0002'
    )
  $$,
  'edits this occurrence and the ones that follow'
);

select results_eq(
  $$
    select occurrence_on::text || ':' || title
    from public.events
    where occurrence_on in ('2026-11-02', '2026-11-09', '2026-11-16')
      and deleted_at is null
    order by occurrence_on
  $$,
  $$ values ('2026-11-02:Week'), ('2026-11-09:Later'), ('2026-11-16:Later') $$,
  'following leaves the earlier occurrence unchanged and keeps the later dates'
);

select lives_ok(
  $$ select public.create_note('Fig', 'Water the fig on Sunday', null, null, 'idem-note-0001') $$,
  'creates a note'
);

select results_eq(
  $$ select jsonb_array_length(public.list_notes(10, 'fig')->'items') $$,
  $$ select 1 $$,
  'note search finds the saved text'
);

select throws_ok(
  $$ select public.create_reminder('Ping', null, null, null, null, 15, 'in_app', 'idem-rem-00001') $$,
  '22023',
  'invalid schedule',
  'an offset reminder requires an event'
);

select lives_ok(
  $$
    select public.create_work_item('Page 1', '', 'personal', 'low', null, null, null, 'idem-page-0001'),
           public.create_work_item('Page 2', '', 'personal', 'low', null, null, null, 'idem-page-0002'),
           public.create_work_item('Page 3', '', 'personal', 'low', null, null, null, 'idem-page-0003')
  $$,
  'creates three work items for pagination'
);

select results_eq(
  $$ select jsonb_array_length(public.list_work_items(2, null, null, null)->'items') $$,
  $$ select 2 $$,
  'the first page returns the requested limit'
);

select results_eq(
  $$
    select jsonb_array_length(public.list_work_items(
      2,
      (public.list_work_items(2, null, null, null)->>'next_created_at')::timestamptz,
      (public.list_work_items(2, null, null, null)->>'next_id')::uuid,
      null
    )->'items')
  $$,
  $$ select 1 $$,
  'the cursor page returns the remaining work item'
);

-- The monthly series is created after the assertion above would have failed.
-- Create it before that assertion by doing it here only if missing.
select lives_ok(
  $$
    select public.create_event(
      'Month end', '', 'admin', true, '2026-01-31', '2026-01-31', null, null,
      'UTC', '', 'monthly', 1, null, 3, 'idem-month-001'
    )
  $$,
  'creates a monthly series from 31 January'
);

select results_eq(
  $$
    select occurrence_on::text
    from public.events
    where title = 'Month end'
    order by occurrence_on
  $$,
  $$ values ('2026-01-31'), ('2026-02-28'), ('2026-03-31') $$,
  'monthly recurrence is anchored to the start date'
);

create temp table captured_work_item (id uuid);
insert into captured_work_item select id from public.work_items where title = 'Page 1';

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.update_work_item(
      (select id from captured_work_item),
      1, 'Stolen', '', 'work', 'low', null, null, null, 'idem-steal-001'
    )
  $$,
  'P0004',
  'not found',
  'user B cannot update user A work items'
);

select throws_ok(
  $$
    select public.create_reminder(
      'Cross',
      (select id from captured_work_item),
      null, null, '2026-11-12', null, 'in_app', 'idem-cross-001'
    )
  $$,
  '23503',
  null,
  'user B cannot attach a reminder to user A work item'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.list_work_items(10, null, null, null) $$,
  '42501',
  null,
  'anonymous callers cannot list work items'
);

select * from finish();
rollback;
