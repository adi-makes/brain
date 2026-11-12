# Hosted Supabase setup

The app talks to a Supabase project you create. This repository does not contain a project, a password, or an API key. Local Docker is only for migration and row-level security tests.

## Create the project

1. Sign in at [supabase.com](https://supabase.com) and create a project. Choose a region close to you. Save the database password in a password manager. Do not put it in Git.
2. In Project Settings → API, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret
3. In Authentication → URL configuration, set Site URL to `http://127.0.0.1:3000` for local development. Add `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback` to the redirect allow list. Add the production URL before you deploy.
4. In Authentication → Providers → Email, keep email confirmations enabled. That is what the app treats as the verified state. Assistant permission is a separate `profiles.ai_permitted` flag and stays off.
5. In Project Settings → Database, note the Postgres major version. `supabase/config.toml` uses 17. If the hosted project is a different major version, change `major_version` before you push migrations.

## Fill the root env file

```bash
cp .env.example .env
```

Set these in `/.env` only:

| Name                            | Where it is used                                                             |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser and Next.js server. The project URL is public.                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and Next.js server. The anon key is public and is restricted by RLS. |
| `SUPABASE_URL`                  | Server-side jobs later. Same project URL. Not a `NEXT_PUBLIC_` variable.     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Future worker or admin jobs only. Never import it from `apps/frontend`.      |
| `FRONTEND_ORIGIN`               | API CORS allow list. Default `http://127.0.0.1:3000`.                        |

Restart `pnpm dev:frontend` after changing `.env`. An empty value means auth stays unconfigured and the workspace lists stay empty.

## Apply the migration

Install the Supabase CLI with the repo (`pnpm install` already adds it) and log in:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

`db push` applies every file in `supabase/migrations`, including the foundation and the productivity functions. The first migration creates the private `attachments` bucket, the 10 MB limit, and the MIME allow list. You do not create that bucket by hand.

Do not run `db push` against a database that already has these table names. There is no down migration. Rolling back means a new migration that drops the foundation in child-to-parent order, including `storage.objects` under `attachments/`.

## Regenerate TypeScript types

With the local database running:

```bash
pnpm exec supabase start
pnpm db:types
```

`pnpm db:types` overwrites `apps/frontend/src/lib/database.types.ts`. Then run `node scripts/check-database-types.mjs`. The checked-in file must name every `create table public.*` in the migrations. Commit the regenerated file. Do not commit `supabase/.temp`.

## Local tests

```bash
pnpm db:test
```

That starts the local stack if needed, applies migrations, and runs `supabase/tests`. It does not use your hosted keys. Docker must be running.
