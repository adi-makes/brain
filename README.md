# Second Brain

Personal productivity workspace. Phase 00 is the repository foundation: a Next.js app, a FastAPI process, a separate worker process, root-only environment files, a prompt journal, and CI. There is no product dashboard yet.

The home page says the workspace is under development.

## Prerequisites

| Tool           | This machine  | Required                     |
| -------------- | ------------- | ---------------------------- |
| Node.js        | 26 Active LTS | `>=26 <27` (`.nvmrc`)        |
| pnpm           | 10.34.9       | declared in `package.json`   |
| Python         | 3.12 via uv   | backend `requires-python`    |
| Docker Compose | Compose v2    | local containers             |
| uv             | installed     | Python lockfile and installs |

System Python may be newer than 3.12. Do not point the backend at it. `services/backend/.python-version` selects 3.12 for uv. pnpm is installed with `npm install -g pnpm@10` when Corepack is absent. Do not use sudo for project setup.

## Setup

```bash
cp .env.example .env
pnpm install
uv sync --project services/backend
sh scripts/install-git-hooks.sh
```

`.env` is optional until a later phase needs credentials. It is gitignored.

## Local processes

```bash
pnpm dev:frontend   # http://127.0.0.1:3000
pnpm dev:api        # http://127.0.0.1:8000/health
pnpm dev:worker     # http://127.0.0.1:8001/health
```

These scripts load the root `.env` and pass it to the child process. Python also reads that file when `SECOND_BRAIN_ENV_FILE` points at it. Next.js does not have its own env file.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:env-layout
pnpm check:prompt-journal
pnpm check:secrets
```

Playwright is configured for later phases:

```bash
pnpm --filter @second-brain/frontend exec playwright install chromium
pnpm test:e2e
```

Phase 00 has no browser specs, so `pnpm test:e2e` is expected to report that no tests were found. CI does not run that command on pull requests. `.github/workflows/playwright.yml` is `workflow_dispatch` only.

## Containers

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs --tail=100
docker compose down
```

Services:

- `frontend` on port 3000, readiness `GET /api/health`
- `backend` on port 8000, readiness `GET /ready`
- `worker` on port 8001, readiness `GET /ready`

The worker and API share `second-brain-backend:local` and use different commands. Compose does not start Supabase, Redis, or Ollama. Health checks define readiness. Start order is not a readiness signal.

## Environment variables

See `.env.example` and `docs/operations/environment.md`.

| Name                            | Phase | Public                      |
| ------------------------------- | ----- | --------------------------- |
| `APP_ENV`                       | 00    | no                          |
| `LOG_LEVEL`                     | 00    | no                          |
| `BACKEND_HOST`                  | 00    | no                          |
| `BACKEND_PORT`                  | 00    | no                          |
| `WORKER_HEALTH_PORT`            | 00    | no                          |
| `NEXT_PUBLIC_APP_NAME`          | 00    | yes, display name only      |
| `NEXT_PUBLIC_SUPABASE_URL`      | 02    | yes, project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 02    | yes, anon key only          |
| `SUPABASE_URL`                  | 02    | no                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | 02    | no                          |
| `GEMINI_API_KEY`                | 07    | no                          |
| `OLLAMA_BASE_URL`               | 07    | no, optional local provider |

CI reads `vars.NEXT_PUBLIC_APP_NAME` and otherwise builds with the default name. No secret is required for Phase 00 CI.

## Git

The working branch for this phase is `phase/00-foundation`. Push that branch. Do not push `main` and do not force-push.

Protect `main` in GitHub so it requires a pull request and these checks: JavaScript, Python, and Env layout and secrets. Enable GitHub secret scanning and push protection for the repository as well. This foundation does not change those repository settings by itself.

## Documentation

- `AGENTS.md` — rules for agents and reviewers
- `docs/architecture/overview.md`
- `docs/decisions/` — monorepo, hosted Supabase, separate worker, single planner
- `docs/development/standards.md`
- `docs/development/prompt-journal.md`
- `docs/testing/strategy.md`
- `docs/prompts/second_brain_cursor_prompt_pack.md` — phase prompts, executed one at a time
