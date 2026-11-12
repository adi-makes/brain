begin;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, email_change_confirm_status, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'planner-a@example.test',
    extensions.crypt('password-a', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', '', '', 0, false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-8444-444444444444',
    'authenticated', 'authenticated', 'planner-b@example.test',
    extensions.crypt('password-b', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', '', '', 0, false, false
  );

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.create_work_item('Plan me', '', 'work', 'high', '2026-11-16', null, 60, 'idem-plan-item') $$,
  'creates the work item that will receive a plan'
);

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      1,
      '55555555-5555-4555-8555-555555555551',
      'hash-overlap-self',
      'UTC',
      '[
        {"starts_at":"2026-11-16T09:00:00Z","ends_at":"2026-11-16T11:00:00Z"},
        {"starts_at":"2026-11-16T10:00:00Z","ends_at":"2026-11-16T12:00:00Z"}
      ]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 'idem-plan-self'
    )
  $$,
  'P0005',
  'planning conflict',
  'one proposal cannot store overlapping blocks'
);

select is(
  (select count(*)::int from public.planning_blocks),
  0,
  'a rejected proposal stores nothing'
);

select lives_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      1,
      '55555555-5555-4555-8555-555555555552',
      'hash-ok',
      'UTC',
      '[{"starts_at":"2026-11-16T09:00:00Z","ends_at":"2026-11-16T10:00:00Z"}]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 'idem-plan-ok'
    )
  $$,
  'stores an approved block'
);

select is(
  (select source from public.planning_blocks),
  'planner',
  'the stored block records the planner as its source'
);

select is(
  (select status from public.planning_blocks),
  'active',
  'planned time stays active and is not marked completed'
);

select is(
  (select count(*)::int from public.events),
  0,
  'approving a plan does not create a calendar event'
);

select results_eq(
  $$
    select (public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      1,
      '55555555-5555-4555-8555-555555555552',
      'hash-ok',
      'UTC',
      '[{"starts_at":"2026-11-16T09:00:00Z","ends_at":"2026-11-16T10:00:00Z"}]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 'idem-plan-ok'
    )->'blocks'->0->>'id')
  $$,
  $$ select id::text from public.planning_blocks $$,
  'the same idempotency key returns the original block'
);

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      1,
      '55555555-5555-4555-8555-555555555559',
      'hash-other',
      'UTC',
      '[{"starts_at":"2026-11-16T11:00:00Z","ends_at":"2026-11-16T12:00:00Z"}]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 'idem-plan-ok'
    )
  $$,
  'P0003',
  'idempotency key reused',
  'the same key cannot apply a different proposal'
);

update public.work_items set title = 'Plan me' where title = 'Plan me';

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      1,
      '55555555-5555-4555-8555-555555555553',
      'hash-stale',
      'UTC',
      '[{"starts_at":"2026-11-17T09:00:00Z","ends_at":"2026-11-17T10:00:00Z"}]'::jsonb,
      '[]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      '[]'::jsonb,
      0,
      'idem-plan-stale'
    )
  $$,
  'P0002',
  'version conflict',
  'a stale work item version asks for a new plan'
);

insert into public.planning_blocks (owner_id, work_item_id, starts_at, ends_at, status, timezone, source)
select owner_id, id, '2026-11-16T13:00:00Z', '2026-11-16T14:00:00Z', 'active', 'UTC', 'user'
from public.work_items where title = 'Plan me';

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      (select version from public.work_items where title = 'Plan me'),
      '55555555-5555-4555-8555-555555555554',
      'hash-busy',
      'UTC',
      '[{"starts_at":"2026-11-16T13:30:00Z","ends_at":"2026-11-16T14:30:00Z"}]'::jsonb,
      '[]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      '[]'::jsonb,
      0,
      'idem-plan-busy'
    )
  $$,
  'P0005',
  'planning conflict',
  'a future active block rejects an overlapping apply'
);

update public.planning_blocks
set status = 'cancelled'
where starts_at = '2026-11-16T13:00:00Z';

select lives_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      (select version from public.work_items where title = 'Plan me'),
      '55555555-5555-4555-8555-555555555555',
      'hash-after-cancel',
      'UTC',
      '[{"starts_at":"2026-11-16T13:30:00Z","ends_at":"2026-11-16T14:30:00Z"}]'::jsonb,
      '[]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      '[]'::jsonb,
      0,
      'idem-plan-after-cancel'
    )
  $$,
  'a cancelled block does not keep the time'
);

insert into public.events (
  owner_id, title, category, all_day, starts_at, ends_at, timezone
)
select owner_id, 'Busy', 'work', false, '2026-11-17T15:00:00Z', '2026-11-17T16:00:00Z', 'UTC'
from public.work_items where title = 'Plan me';

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      (select version from public.work_items where title = 'Plan me'),
      '55555555-5555-4555-8555-555555555556',
      'hash-event',
      'UTC',
      '[{"starts_at":"2026-11-17T15:30:00Z","ends_at":"2026-11-17T16:30:00Z"}]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.events),
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      '[]'::jsonb,
      0,
      'idem-plan-event'
    )
  $$,
  'P0005',
  'planning conflict',
  'a calendar event rejects an overlapping apply'
);

insert into public.task_effort_logs (owner_id, work_item_id, started_at, ended_at, minutes)
select owner_id, id, '2026-11-15T09:00:00Z', '2026-11-15T10:00:00Z', 60
from public.work_items where title = 'Plan me';

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      (select version from public.work_items where title = 'Plan me'),
      '55555555-5555-4555-8555-555555555557',
      'hash-effort',
      'UTC',
      '[{"starts_at":"2026-11-18T09:00:00Z","ends_at":"2026-11-18T10:00:00Z"}]'::jsonb,
      '[]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      '[]'::jsonb,
      0,
      'idem-plan-effort'
    )
  $$,
  'P0002',
  'version conflict',
  'a new effort log makes the proposal stale'
);

insert into public.planning_preferences (owner_id) values ((select auth.uid()));

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      (select version from public.work_items where title = 'Plan me'),
      '55555555-5555-4555-8555-555555555558',
      'hash-pref',
      'UTC',
      '[{"starts_at":"2026-11-18T11:00:00Z","ends_at":"2026-11-18T12:00:00Z"}]'::jsonb,
      '[]'::jsonb,
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.planning_blocks),
      (select jsonb_agg(jsonb_build_object('id', id, 'version', version)) from public.task_effort_logs),
      0,
      'idem-plan-pref'
    )
  $$,
  'P0002',
  'version conflict',
  'a new preference row makes the proposal stale'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.apply_planning_proposal(
      (select id from public.work_items where title = 'Plan me'),
      2,
      '55555555-5555-4555-8555-555555555560',
      'hash-other-owner',
      'UTC',
      '[{"starts_at":"2026-11-19T09:00:00Z","ends_at":"2026-11-19T10:00:00Z"}]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 'idem-plan-other'
    )
  $$,
  'P0004',
  'not found',
  'another owner cannot apply the plan'
);

select * from finish();
rollback;
