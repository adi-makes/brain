# Second Brain

Second Brain is a personal productivity workspace centred on a calendar. Work items are the canonical task record. Today, Upcoming Work, and To-Do are projections of that record, not separate task lists. An assistant may later propose changes. It does not write them by itself. The workspace stays useful without the assistant.

This repository is a pnpm and uv monorepo:

- `apps/frontend` — Next.js App Router. Signed-in people can save tasks, events, notes, and reminder definitions. The assistant does not write records.
- `services/backend` — FastAPI API and a separate worker process. They share one Python package and image. The worker does not deliver reminders yet.
- `packages/schemas` — shared validation.
- `packages/planner-contracts` — typed planner contract. The scheduler itself is the Python service.
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

`.env` is gitignored. With the Supabase values empty, sign-in says that Supabase is not configured and the workspace lists stay empty. Nothing is saved in the browser.

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

## Features

Run `pnpm dev:frontend` and open `http://127.0.0.1:3000`. Saving requires a signed-in account and `pnpm exec supabase db push`. Planning also needs `pnpm dev:api`. Until then the lists stay empty. The Workspace state menu can show Empty, Dense, Overdue, and the four plan previews. Those previews are not saved.

| What                                 | How to open it                                                                                                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar day, week, and month        | `/`. Day, Week, and Month. Arrow keys move the selected day.                                                                                                                                                                 |
| Today, Upcoming work, and To-Do      | The list on `/`. On a phone, Today is in the bottom bar.                                                                                                                                                                     |
| Why a task is in a section           | The row says Due today, Overdue, Due soon, or Manually pinned. To-Do says why something is left out, such as Dismissed or No due date.                                                                                       |
| Add a task, event, note, or reminder | Add. A task needs a due date and Critical, High, or Medium severity before it appears on Today or Upcoming. Low stays on To-Do unless you pin it.                                                                            |
| Search saved records                 | Search, or Ctrl+K / Cmd+K.                                                                                                                                                                                                   |
| Change or delete a record            | Select its title. Events can apply to this one, this and following, or the whole series.                                                                                                                                     |
| Dismiss, restore, or pin a task      | Dismiss on Today or Upcoming. Restore and Pin are on the To-Do row.                                                                                                                                                          |
| Mark a task done                     | Mark done on the To-Do row.                                                                                                                                                                                                  |
| Drag a timed event                   | On the day or week calendar, in 15-minute steps.                                                                                                                                                                             |
| Settings                             | Settings, or `/settings`. Theme and display stay in this browser.                                                                                                                                                            |
| Sign in, sign up, account            | Sign in, `/sign-in`, `/sign-up`, and `/account`.                                                                                                                                                                             |
| Plan a task                          | Plan on a task. The preview is not saved. Approve stores planned time. Reject discards it. Update preview asks the planner for a new result after you change the daily load or preferred window. Run `pnpm dev:api` as well. |
| Assistant                            | Assistant. It does not send anything and it does not schedule time.                                                                                                                                                          |
| Reminder definitions                 | The Reminders section. Nothing is delivered.                                                                                                                                                                                 |

Critical work appears 7 days before it is due, High 3 days, Medium 1 day, and Low never, using the timezone on the profile. Overdue open work in those three severities stays on Today until you dismiss it, finish it, or cancel it. Reconciliation does not bring a dismissed task back. The rules are in `docs/architecture/surfacing.md`.

A dashed calendar block is a proposal. A solid accent block is planned time. Neither one is completed work. Completed work stays in effort logs.

Not built yet: reminder delivery, assistant proposals, offline sync, and a restore control for a soft-deleted task. `restore_work_item` exists in the database. The screen does not call it. The rules for planning are in `docs/architecture/planner.md`.

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

Commit on `main`. Do not open a `phase/*` branch. Do not force-push.

Keep the JavaScript, Python, and secret-scan checks. Enable GitHub secret scanning and push protection.

## Documentation

- `AGENTS.md` — agent rules
- `docs/architecture/overview.md`
- `docs/architecture/schema.md` — canonical tables and delete behavior
- `docs/architecture/surfacing.md` — Today, Upcoming, and To-Do
- `docs/operations/supabase.md` — project setup and `db push`
- `docs/operations/security.md` — cookies, CORS, rate limits
- `docs/decisions/` — monorepo, hosted Supabase, worker, planner
- `docs/development/standards.md`
- `docs/development/prompt-journal.md`
- `docs/testing/strategy.md`
- `docs/prompts/second_brain_cursor_prompt_pack.md`
