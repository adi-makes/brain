# Environment files

Only these files are allowed:

| Path                   | Role                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `/.env`                | Local secrets and developer values. Gitignored. Never tracked. |
| `/.env.example`        | Safe placeholders. Tracked.                                    |
| `/.env.<name>.example` | Optional root template if a later phase documents a real need. |

No `.env`, `.env.local`, `.env.development`, `.env.test`, or `.env.production` file may exist under `apps/`, `services/`, `packages/`, `supabase/`, `deploy/`, or any other nested directory.

`scripts/check-env-layout.mjs` enforces that rule. It skips dependency and build directories (`node_modules`, `.venv`, `.next`, and the other names listed in the script) because those are not project source. A nested env file in source still fails.

## How processes receive the root file

- `node scripts/with-root-env.mjs <command>` parses `/.env` and passes values in the child environment. Variables already set in the shell or CI are kept.
- The loader sets `SECOND_BRAIN_ENV_FILE` to the absolute root `.env` path when the file exists. Python settings read that file and do not create one when it is missing.
- Next.js is started only through the root scripts, so it sees the variables in its process environment. It must not grow a nested env file.
- `compose.yaml` sets `env_file` to the root `.env` with `required: false` and interpolates the same variables for Compose. Run Compose from the repository root, or use `pnpm compose:up`.
- GitHub Actions uses repository variables and secrets. Phase 00's build defaults `NEXT_PUBLIC_APP_NAME` when the variable is unset. Do not commit a CI env file.

## Public variables

`NEXT_PUBLIC_` values are embedded in the browser bundle. The only approved public variable in Phase 00 is `NEXT_PUBLIC_APP_NAME`. Service-role keys, Gemini keys, email credentials, and Web Push private keys must not use that prefix.

## Local setup

```bash
cp .env.example .env
pnpm dev:frontend
pnpm dev:api
pnpm dev:worker
```

`.env` is optional for the foundation health checks. Create it before adding real credentials in later phases.
