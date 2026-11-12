begin;

select plan(15);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  email_change_confirm_status,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'a@example.test',
    extensions.crypt('password-a', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'b@example.test',
    extensions.crypt('password-b', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    false,
    false
  );

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    insert into public.work_items (id, owner_id, title, category, severity)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'Draft the note',
      'personal',
      'high'
    )
  $$,
  'user A can insert an owned work item'
);

select results_eq(
  $$ select count(*)::int from public.work_items $$,
  $$ select 1 $$,
  'user A sees their own work item'
);

select throws_ok(
  $$
    update public.work_items
    set owner_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  $$,
  'P0001',
  'owner_id cannot change',
  'user A cannot transfer a row to user B'
);

select throws_ok(
  $$
    insert into public.work_items (owner_id, title, category, severity)
    values ('22222222-2222-4222-8222-222222222222', 'Stolen', 'work', 'low')
  $$,
  '42501',
  null,
  'user A cannot insert a row owned by user B'
);

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$ select count(*)::int from public.work_items $$,
  $$ select 0 $$,
  'user B cannot read user A work items'
);

select results_eq(
  $$
    update public.work_items
    set title = 'Changed'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning 1
  $$,
  $$ select 1 where false $$,
  'user B cannot update user A work items'
);

select results_eq(
  $$
    delete from public.work_items
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning 1
  $$,
  $$ select 1 where false $$,
  'user B cannot delete user A work items'
);

select throws_ok(
  $$
    insert into public.notes (owner_id, work_item_id, title, body)
    values (
      '22222222-2222-4222-8222-222222222222',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Cross link',
      'Should fail the composite foreign key.'
    )
  $$,
  '23503',
  null,
  'user B cannot attach a note to user A work item'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values (
      'attachments',
      '11111111-1111-4111-8111-111111111111/file.txt',
      '{"mimetype":"text/plain","size":4}'::jsonb
    )
  $$,
  '42501',
  null,
  'user B cannot write a file under user A path'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, metadata)
    values (
      'attachments',
      '22222222-2222-4222-8222-222222222222/file.txt',
      '{"mimetype":"text/plain","size":4}'::jsonb
    )
  $$,
  'user B can write a file under their own path'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;

select throws_ok(
  $$ select count(*) from public.work_items $$,
  '42501',
  null,
  'anonymous role cannot read work items'
);

select throws_ok(
  $$
    insert into public.work_items (owner_id, title, category, severity)
    values ('11111111-1111-4111-8111-111111111111', 'Anon', 'personal', 'low')
  $$,
  '42501',
  null,
  'anonymous role cannot insert work items'
);

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'attachments' $$,
  $$ select 0 $$,
  'user A cannot read user B files'
);

select results_eq(
  $$ select id::text from public.profiles $$,
  $$ select '11111111-1111-4111-8111-111111111111' $$,
  'user A reads only their profile'
);

select results_eq(
  $$ select count(*)::int from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  $$ select 0 $$,
  'user A cannot read user B profile'
);

select * from finish();

rollback;
