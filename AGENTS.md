# Agent instructions

Second Brain is a personal productivity workspace centered on a useful calendar. The product must stay useful without AI. Read Part A of `docs/prompts/second_brain_cursor_prompt_pack.md` before changing behavior. This file is the working summary of those rules.

## Phase gates

- Inspect the repository, `prompt_responses.md`, the current branch, and `git status` before editing.
- Implement only the phase the user requested. Do not start the next phase in the same turn.
- Preserve existing user work. If a requested change would overwrite it, stop and report the conflict.
- Do not claim a command, test, browser check, or screenshot review succeeded unless it actually ran. Record what was skipped and why.
- End every phase with an engineering report. Wait for the owner to approve before merging to `main` or beginning the next phase.

## Layout

- `apps/frontend` — Next.js App Router.
- `services/backend` — one Python package. The API and worker are different modules and different processes.
- `packages/schemas` — shared validation.
- `packages/planner-contracts` — contract documentation only. Do not add a second planner.
- `supabase/` — hosted Supabase migrations and tests. Do not add a self-hosted Supabase stack to Compose.
- Root `.env` and root `.env.example` are the only env files unless a later phase documents a root `.env.*.example`.

## Environment and secrets

- Do not create nested env files.
- Do not put secrets in `NEXT_PUBLIC_*` variables.
- Do not commit `.env`, service-role keys, model keys, tokens, or private keys.
- CI uses GitHub Actions secrets and variables.
- Run `pnpm check:env-layout` and `pnpm check:secrets` before committing.
- If a secret is committed, stop. Rotating the credential comes before history cleanup. A later commit that deletes the file is not enough.

## Prompt journal

- Project hooks append exact prompt and assistant text to `prompt_responses.md`.
- Do not log hidden reasoning, tool output, or secrets.
- Do not rewrite old journal entries.
- Do not mark text `HOOK VERIFIED` unless the hook captured it, and do not mark it `BOOTSTRAP SOURCE: PROMPT PACK FILE` unless it was extracted unchanged from the prompt pack.
- If the hook did not receive the text, record `MANUAL EXPORT REQUIRED` and follow `docs/development/prompt-journal.md`. Never invent a transcript.

## Product rules that later phases must not weaken

- Work items are canonical. Today, Upcoming, and To-Do are projections.
- Dismissal state is stored separately so reconciliation does not resurrect it.
- Recurrence keeps series, exceptions, original occurrence identity, timezone, and DST behavior.
- Reminder delivery uses a transactional outbox and idempotent worker claims. Enqueueing is not delivery.
- AI proposals bind to the user, proposal id, canonical payload hash, expiry, and resource versions. Revalidate immediately before writing. The agent does not get an unrestricted service-role key.
- Notes and imported content are untrusted input.
- Undo is version-aware and must not overwrite newer edits.
- Offline mutations stay user-scoped and ordered. Do not cache private API responses broadly.
- One planner implementation, in Python. Planned time is not completed effort. Ghost blocks stay unpersisted until approval.
- Every user-owned table and child relationship gets RLS. Storage paths are owner-scoped.

## UI and verification

- Target WCAG 2.2 AA, keyboard use, 44px touch targets, and a quiet theme. Avoid decorative dashboards, gratuitous gradients, and sparkle motifs.
- For UI phases, run the app in a browser and inspect the required viewport and theme matrix. Screenshots go under `artifacts/screenshots/`. Open the screenshots. A passing Playwright run is not a visual review.
- Distinguish loading, empty, error, and offline states. Skeletons should match the content they replace.

## GitHub

- Work on `phase/<nn>-<name>`.
- Use Conventional Commits.
- Stage explicit paths. Inspect `git status` and the diff before committing.
- Do not force-push, hard-reset, or push `main`.
- Push the phase branch when `origin` exists and authentication works.
- Recommend branch protection on `main` that requires the CI checks.

## Commands

```bash
pnpm dev:frontend
pnpm dev:api
pnpm dev:worker
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:env-layout
pnpm check:prompt-journal
pnpm check:secrets
pnpm compose:up
```

Python commands run through `uv` inside `services/backend`. System Python may be newer than 3.12. The backend requires the uv-managed 3.12 runtime.
