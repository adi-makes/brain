# Testing strategy

## Phase 00

Run on every pull request and on pushes to `main`:

- `pnpm install --frozen-lockfile`
- JavaScript lint, typecheck, unit tests, and production build
- Python Ruff check, Ruff format check, and pytest
- `pnpm check:env-layout`
- `pnpm check:prompt-journal`
- Gitleaks

Playwright is configured in `apps/frontend/playwright.config.ts`. The Playwright workflow is manual until browser specs exist. It does not use `continue-on-error`.

## Later phases

- Phase 01 adds component tests and Playwright coverage, including keyboard and responsive checks, plus screenshot review.
- Phase 02 adds migration tests and two-user RLS tests. Those tests are required before calling authorization done.
- API tests should cover validation, conflicts, idempotency, and ownership.
- Worker tests should cover claims, retries, and shutdown once jobs exist.
- Do not treat a green unit suite as visual QA or as a penetration test.

## Local commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:env-layout
pnpm check:prompt-journal
pnpm check:secrets
uv run --project services/backend ruff check
uv run --project services/backend ruff format --check
uv run --project services/backend pytest
```
