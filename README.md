# Second Brain

Second Brain is a personal productivity workspace centred on a calendar. Work items are the canonical task record. Today, Upcoming Work, and To-Do are projections of that record, not separate task lists. An assistant may later propose changes. It does not write them by itself. The workspace stays useful without the assistant.

This repository is a pnpm and uv monorepo:

- `apps/frontend` — Next.js App Router. Phase 01 is the local fixture workspace. Phase 02 adds Supabase Auth around that shell. Task, event, and note editing against the database is not built yet.
- `services/backend` — FastAPI API and a separate worker process. They share one Python package and image. The worker does not deliver reminders yet.
- `packages/schemas` — shared validation.
- `packages/planner-contracts` — planner contract notes only. There is one planner, and it is not implemented yet.
- `supabase/` — hosted Supabase migrations, local CLI config, and row-level security tests. Compose does not start a database.

The hosted database is Supabase (PostgreSQL, Auth, and Storage). Gemini is the planned model provider and is not wired up.

## Prerequisites

| Tool               | Required                                 |
| ------------------ | ---------------------------------------- |
| Node.js            | `>=26 <27`, see `.nvmrc`                 |
| pnpm               | `10.34.9`, see `package.json`            |
| uv                 | installs the backend's Python 3.12       |
| Docker Compose     | optional, for the app containers         |
| Docker             | required only to run `pnpm db:test`      |
| A Supabase project | required only when you want real sign-in |

System Python may be newer than 3.12. Do not point the backend at it. Install pnpm with `npm install -g pnpm@10.34.9` when Corepack is missing. Do not use sudo for project setup.

## Setup

```bash
cp .env.example .env
pnpm install
uv sync --project services/backend
sh scripts/install-git-hooks.sh
```

`.env` is gitignored. The fixture workspace runs with the Supabase values left empty. Sign-in then says that Supabase is not configured, and the sample calendar stays in the browser tab.

## What you configure in Supabase

Do this once, in the Supabase dashboard and the root `.env`. The app cannot create the project for you.

1. Create a project at [supabase.com](https://supabase.com). Store the database password outside Git.
2. In Project Settings → API, copy the project URL, the anon key, and the service-role key.
3. Put them in `/.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
FRONTEND_ORIGIN=http://127.0.0.1:3000
```

The anon key is public and is limited by row-level security. The service-role key bypasses that security. Never put it in a `NEXT_PUBLIC_` variable, never import it from the frontend, and never commit `.env`.

4. In Authentication → URL configuration, set Site URL to `http://127.0.0.1:3000`. Add these redirect URLs:

- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/callback`

5. Leave email confirmation enabled. A confirmed email is the verified state. Assistant permission is a separate flag on `profiles` and stays off. You can use the workspace without either.
6. Check Project Settings → Database for the Postgres major version. `supabase/config.toml` expects 17. Change `major_version` if your project differs.
7. Log in and apply the migration:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

The migration creates the private `attachments` bucket (10 MB; jpeg, png, webp, pdf, and plain text). You do not create that bucket by hand.

8. Restart `pnpm dev:frontend`.

Full notes: `docs/operations/supabase.md` and `docs/operations/environment.md`.

## Local processes

```bash
pnpm dev:frontend   # http://127.0.0.1:3000
pnpm dev:api        # http://127.0.0.1:8000/health
pnpm dev:worker     # http://127.0.0.1:8001/health
```

These scripts load the root `.env`. There is no env file inside `apps/` or `services/`.

Routes:

- `/` workspace fixtures
- `/settings` local theme and display preferences
- `/sign-in` and `/sign-up`
- `/account` requires a session when Supabase is configured

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:env-layout
pnpm check:prompt-journal
pnpm check:secrets
pnpm test:e2e
```

Database isolation tests need Docker:

```bash
pnpm db:test
```

Regenerate TypeScript types after the local database is up:

```bash
pnpm exec supabase start
pnpm db:types
```

## Containers

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose down
```

Compose starts the frontend, API, and worker. It does not start Supabase, Redis, or Ollama.

## Environment variables

| Name                            | Public | Purpose                                         |
| ------------------------------- | ------ | ----------------------------------------------- |
| `APP_ENV`                       | no     | `local` or a deployment name                    |
| `LOG_LEVEL`                     | no     | API and worker logs                             |
| `BACKEND_HOST`                  | no     | API bind address                                |
| `BACKEND_PORT`                  | no     | API port, default 8000                          |
| `WORKER_HEALTH_PORT`            | no     | Worker health port, default 8001                |
| `FRONTEND_ORIGIN`               | no     | The only browser origin allowed to call the API |
| `NEXT_PUBLIC_APP_NAME`          | yes    | Display name                                    |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes    | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes    | Supabase anon key                               |
| `SUPABASE_URL`                  | no     | Same project URL for server jobs                |
| `SUPABASE_SERVICE_ROLE_KEY`     | no     | Bypasses RLS. Server only.                      |
| `GEMINI_API_KEY`                | no     | Later assistant phase                           |
| `OLLAMA_BASE_URL`               | no     | Optional local model, not production            |

## Git

Work on `phase/02-supabase-auth`. Do not push `main` and do not force-push.

Protect `main` so it requires a pull request and the JavaScript, Python, and secret-scan checks. Enable GitHub secret scanning and push protection.

## Documentation

- `AGENTS.md` — agent rules
- `docs/architecture/overview.md`
- `docs/architecture/schema.md` — canonical tables and delete behavior
- `docs/operations/supabase.md` — project setup and `db push`
- `docs/operations/security.md` — cookies, CORS, rate limits
- `docs/decisions/` — monorepo, hosted Supabase, worker, planner
- `docs/development/standards.md`
- `docs/development/prompt-journal.md`
- `docs/testing/strategy.md`
- `docs/prompts/second_brain_cursor_prompt_pack.md`
