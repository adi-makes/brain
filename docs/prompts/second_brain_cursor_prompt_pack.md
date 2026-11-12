# Second Brain — Complete Cursor Build Prompt Pack

> **How to use this pack:** Execute only one phase at a time, in order. Paste the complete prompt for that phase into Cursor Agent. Do not paste all phases into one Cursor conversation. Review the engineering report, verify the tests yourself, inspect the Git diff, and approve the phase before starting the next one.
>
> **Project status:** These are implementation prompts, not evidence that any phase has been implemented. The repository does not exist until you create it and run Phase 00.
>
> **Owner decision (2026-11-12):** All implementation commits go on `main`. Do not create `phase/*` branches. This supersedes the branch instructions in A5 and in the phase prompts below. Still implement only the requested phase, then stop. After every prompt, update `README.md` as `.cursor/rules/main-and-readme.mdc` requires. The historical prompt text stays unchanged.

---

# Part A — Decisions that apply to the whole project

## A1. Product definition

Second Brain is a personal productivity workspace centred on a useful calendar. It manages tasks/work items, events, reminders and notes; presents Today, Upcoming Work and To-Do; supports deterministic planning; and offers an AI assistant that proposes changes but never silently writes user data.

The product must remain fully useful without AI. The first release targets individual accounts. Use hosted Supabase for PostgreSQL, Auth, Realtime and Storage. The Python backend hosts the agent API and a separate worker process. Gemini is the primary model provider; Ollama is optional for local experimentation and must not be a production dependency. Google Calendar sync, daily briefings and weekly reviews are later enhancements, not MVP blockers.

## A2. Required repository layout

Use a clear frontend/backend separation. The intended structure is:

```text
second-brain/
├── apps/
│   └── frontend/                 # Next.js App Router application
├── services/
│   └── backend/                  # FastAPI API + separate worker entrypoint
├── packages/
│   ├── schemas/                  # Shared TypeScript contracts/validation
│   └── planner-contracts/        # Planner API contracts only; no duplicate engine
├── supabase/
│   ├── migrations/
│   ├── tests/
│   └── config.toml
├── deploy/
│   └── caddy/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── development/
│   ├── operations/
│   └── testing/
├── scripts/
├── artifacts/
│   └── screenshots/
├── .cursor/
│   ├── rules/
│   ├── hooks/
│   └── hooks.json
├── .github/
│   └── workflows/
├── AGENTS.md
├── prompt_responses.md
├── .env                       # local only; ignored by Git
├── .env.example               # safe template; tracked
├── .gitignore
├── compose.yaml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── README.md
```

Small improvements are allowed only when documented. Do not create empty directories without a purpose. `services/backend` contains distinct API and worker modules and distinct process entrypoints; they may share one Python package and Docker build context, but must run as separate processes.

## A3. Environment-file policy — strict

The **only environment files** permitted anywhere in the repository are:

- `/ .env` — local secrets and developer-specific values; never committed.
- `/ .env.example` — placeholder template; committed and safe.
- Optional root-only `.env.*.example` templates only if a genuine need is documented. Prefer not to create them.

No `.env`, `.env.local`, `.env.development`, `.env.test`, `.env.production`, or other env files may exist inside `apps/`, `services/`, `packages/`, `supabase/`, `deploy/`, or any nested folder.

All local commands must load the root `.env` and pass values to child processes. Use a documented root-level env loader (for example, `dotenv-cli`) and root scripts. Docker Compose must use the root `.env`/root `env_file` where appropriate. CI must use GitHub Actions secrets/variables, not committed env files. Python configuration must receive environment variables from the process or explicitly read the root env file without creating another one. Next.js must receive the root variables through the root launcher; do not rely on Next.js discovering a nested env file.

Add an automated `scripts/check-env-layout` check that fails if any env file is found below the repository root, or if any root env file other than the approved names is present. Ensure `.env` is in `.gitignore`, and verify it is not tracked. Do not put secrets in `NEXT_PUBLIC_*` variables. Only genuinely public values may use that prefix. Never expose Supabase service-role keys, agent secrets, Gemini keys, email credentials or Web Push private keys to browser bundles.

## A4. Prompt/response journal — exact transcript requirement

The root `prompt_responses.md` is a durable project record. It must preserve:

1. The exact full prompt submitted by the user to Cursor Agent, character-for-character to the extent the hook receives it.
2. The exact assistant response text returned by Cursor Agent after the turn completes, including the engineering report. Do not rewrite, summarize, paraphrase, spell-correct, or condense it.
3. Phase identifier, UTC timestamp, session/conversation identifier if Cursor supplies one, and whether the capture is verified.
4. Relevant test command results, commit hash, branch and push status. Test logs may be linked to files under `artifacts/logs/` to avoid bloating the journal, but the prompt and assistant response text must remain verbatim in the journal.
5. Re-runs and corrections are appended as new entries. Never overwrite an earlier prompt or response.

Implement Cursor project hooks using the documented `beforeSubmitPrompt` and `afterAgentResponse` events if supported by the installed Cursor version. The first captures the submitted prompt; the second captures the assistant's completed response text. Use a small, robust script that reads hook JSON from stdin and appends to the root journal. IMPORTANT BOOTSTRAP: project hooks do not exist before this Phase 00 prompt is submitted, so they cannot retroactively capture the initial submission. If the prompt pack file has been copied into the repository at `docs/prompts/second_brain_cursor_prompt_pack.md`, use a deterministic script to extract the exact Phase 00 prompt block and initialize the journal with that exact text, clearly marked `BOOTSTRAP SOURCE: PROMPT PACK FILE`. Do not regenerate or paraphrase it. If that source file is absent, mark the initial prompt `MANUAL EXPORT REQUIRED` and ask the developer to export the current Cursor transcript; never claim it was automatically captured. Preserve multiline content and Markdown safely (choose a dynamically sized fenced code block or equivalent). Use a file lock/atomic append where practical. Do not log model hidden reasoning or secrets from environment variables. Do not capture tool output as if it were the assistant's final response. Add tests for multiline text, embedded backticks, Unicode and repeated appends.

Important limitations and honest status:
- Hooks can only record the exact text supplied to them. Do not claim they capture hidden reasoning, every tool result, attachments' binary contents, or text Cursor does not expose.
- If `beforeSubmitPrompt`/`afterAgentResponse` are unavailable or disabled, record capture as **MANUAL EXPORT REQUIRED**, and document the exact Cursor UI workflow to export the chat transcript to Markdown and append it without editing.
- Do not mark a record as verbatim/verified unless the hook captured it or the exported transcript was preserved unchanged.
- Add a `scripts/verify-prompt-journal` check that confirms every captured prompt has a corresponding response or an explicit pending/manual-export status.
- The journal itself must not contain secrets. Warn before recording a prompt that appears to contain API keys, passwords, tokens or private credentials; never silently redact and then label the result verbatim. Stop and ask the developer to remove secrets from the prompt first.

## A5. Git safety and GitHub workflow

Git is mandatory from the first phase.

- Initialize Git, create a `main` branch, and work on a phase branch such as `phase/00-foundation`, `phase/01-design-system`, etc.
- Create small, coherent commits. Use Conventional Commit-style messages, e.g. `chore(repo): establish monorepo foundation`, `feat(ui): build responsive workspace shell`, `feat(auth): add Supabase authentication`, `test(security): verify cross-user RLS isolation`.
- Never commit `.env`, secrets, credentials, private keys, service-role keys, local databases, build outputs, dependency directories, caches, browser profiles, or personal data.
- Add `.gitignore`, `.gitattributes`, and secret scanning. Prefer GitHub secret scanning/Push Protection when available, plus a local scanner such as Gitleaks. Do not assume a scanner is installed; report the actual result.
- Before every commit: inspect `git status`, inspect the diff, run secret/env-layout checks, run phase-required checks, and ensure no unrelated user changes are included.
- Never use `git add .` blindly. Stage explicit files or inspect staged changes before committing.
- Never use `git push --force`, `--force-with-lease`, destructive reset, or amend a published commit.
- Do not rewrite history to hide mistakes. If a secret is committed, stop, rotate/revoke it, and follow an incident cleanup procedure; removing it in a later commit is not sufficient.
- When a GitHub `origin` remote exists and authentication works, push the completed phase branch after tests and commit. Do not push failing or unreviewed work. Never push directly to `main`. If no remote exists, prepare the branch and commit, then report the exact steps needed to add the user's GitHub remote. Do not invent a repository URL or create a remote without the user's explicit details.
- At the end of each phase, report branch, commit hash, remote, push result and clean/dirty working-tree status. Wait for user approval before merging to `main` or beginning the next phase.
- Keep CI required checks on pull requests. Recommend branch protection for `main`, requiring review and passing CI.

## A6. Global engineering and product constraints

- Inspect the current repository, `AGENTS.md`, phase journal and Git status before editing. Preserve user work.
- Implement only the phase explicitly requested. Do not jump ahead.
- Use stable, mutually compatible dependencies and committed lockfiles.
- TypeScript strict mode; typed Python; Pydantic/Zod validation at boundaries; no casual `any`, unsafe casts or ignored errors.
- Centralize domain rules. Do not duplicate planner algorithms in TypeScript and Python. Planner has one authoritative implementation exposed through a documented API.
- Use explicit errors, transactions, idempotency and optimistic version checks where appropriate.
- Do not create fake production features, dead buttons, mock completion or misleading placeholders.
- All user-owned records and child records must have ownership-safe authorization and RLS. Never trust a client-supplied `user_id`.
- AI can propose mutations only. User approval must bind to exact canonical payload hash, user, proposal, expiry and resource versions; revalidate immediately before atomic execution.
- Keep UI accessible (target WCAG 2.2 AA), keyboard usable, responsive, touch-friendly (44px targets), theme-aware and visually inspected.
- No generic AI-dashboard look: avoid gratuitous gradients, excessive cards, oversized headings, decorative sparkles, excessive rounded corners and distracting motion.
- Use skeletons that match actual content geometry. Preserve loaded content during background refetch. Show inline progress for small actions. Distinguish loading, empty, error and offline states.
- Never claim a command/test/build/browser inspection succeeded unless it actually ran. Record skipped checks and why.
- Every phase ends with an engineering report and a stop for user review.

## A7. Accepted domain architecture — do not weaken these requirements

### Canonical work items and auto-surfacing
A work item is the canonical task/work record. Today/Upcoming/To-Do are projections, not duplicate task records. Store dismissal/restore state separately (e.g. `auto_surface_states`) so scheduled reconciliation does not resurrect dismissed items. Changes to due date/severity recalculate eligibility without erasing dismissal history. Provide manual restore.

### Recurrence
Do not rely on RRULE alone. Model recurrence series and exceptions/overrides, original occurrence identity, cancellation, “this / this and following / all” operations, deterministic generation, timezone and DST behavior, and unique occurrence identity. Store instants as `timestamptz`; preserve local wall time and IANA timezone for recurring series. All-day values preserve local-date semantics. Prevent duplicate occurrence reminders.

### Reminder delivery
Use a transactional outbox, atomic worker claims (e.g. `FOR UPDATE SKIP LOCKED`), unique delivery/idempotency keys, per-channel delivery records, attempt history, retry/backoff/dead-letter state, and idempotent acknowledge/snooze. Enqueueing is not delivery. Do not promise provider exactly-once semantics. Quiet hours must support timezone and overnight ranges. Event-linked offset reminders recalculate when the event changes.

### AI proposal and approval
Bind approvals to user, proposal ID, exact canonical payload hash, expiry and resource versions. Revalidate ownership, permissions, conflicts and all resource versions immediately before writing. Consume a single-use approval atomically with the mutation. Reject expired, stale, replayed or mismatched proposals. LangGraph resume must revalidate user, permission, proposal status and versions. Do not give the agent an unrestricted service-role key. Treat notes, event descriptions and external content as untrusted prompt-injection input.

### Undo
Use version-aware undo with before/after snapshots and the version created by the original operation. Reject or reconcile undo if the resource changed later; never overwrite newer edits.

### Offline sync
Use IndexedDB/Dexie mutation outbox with operation ID, user scope, entity ID, operation, payload, base version, dependencies, timestamps, retry metadata and status. Replay in dependency order, use idempotency, expose conflicts and resolution, and support optimistic rollback. Isolate/clear account caches on logout/account switch. Do not cache private API responses indiscriminately. Be honest about browser background execution and local notification limits.

### Deterministic planner
Separate `planning_blocks` from ordinary calendar events. `task_effort_logs` are authoritative completed effort. Planned time is not completed effort. Separate free calendar time from preferred planning windows. Compute feasible remaining capacity and safety deadline; count only future active blocks; account for completion, cancelled/obsolete blocks, protected hours, daily load and breaks. Return explicit overdue/insufficient-capacity outcomes; never create negative horizons or artificial one-hour clamps. Use deterministic, explainable scores. AI cannot invent slots or write planning blocks. Proposed ghost blocks remain unpersisted until explicit approval and are revalidated on apply.

### Database, security and operations
Use FKs, checks, unique constraints, indexes, ownership-safe composite constraints, soft delete where appropriate, audit journal, and user-scoped integrity. Include tables as required for planning blocks, recurrence series/exceptions, effort logs, auto-surface state, operation journal/batch items, notification deliveries, idempotency keys, AI approval records, device/session state and attachment metadata. RLS every user-owned table and child relationship. Storage policies enforce owner-scoped object paths, MIME/type validation, scanning and quotas. Add CSP, CSRF, CORS, XSS, SSRF, rate limits, secret handling and upload controls. Export/delete must cover database rows, storage objects, queued jobs and related records; document hard delete vs any grace period. Use hosted Supabase initially; worker and agent API are separate processes. PostgreSQL-backed outbox is durable source of truth; Redis is optional and not required. Pin dependencies, test migration recovery and backup restore. Use dev/staging/prod separation.

### Initial product defaults
Critical work surfaces 7 days before due; High 3 days; Medium 1 day; Low never by default. Severity-only eligibility initially; category-specific rules can follow. Single-user accounts for MVP. Google Calendar sync, daily briefing and weekly review are later releases. Manual-first. Implement offline only after online CRUD, versions and idempotency are sound. AI after the manual core.

---

# Part B — Phase prompts

## Phase 00 — Repository foundation, hooks, tooling and Git safety

**Paste the following prompt into Cursor Agent:**

```text
# SECOND BRAIN — PHASE 00: REPOSITORY FOUNDATION

Act as the lead platform engineer. Read the entire root-level build prompt pack if it exists, especially Part A, and obey it. This is Phase 00 only.

GOAL
Create a clean, production-minded monorepo with separate frontend and backend folders, root-only environment files, a reliable exact prompt/response journal, safe Git/GitHub workflow, tooling, documentation and CI. Do not build product functionality or the dashboard.

FIRST: INSPECT
1. Inspect current directory, files, installed tool versions, Git status/remotes/branches, and existing user work.
2. Do not overwrite existing work. Report any conflict before changing it.
3. Check Node LTS, pnpm, Python 3.12, Docker and Compose. Do not silently install system packages or use sudo.
4. Confirm whether this is an empty repo and whether GitHub origin is configured.

LAYOUT
Create the Part A2 layout with `apps/frontend` and `services/backend`. Backend must have separate FastAPI API and worker modules/entrypoints, but may share one Python package and Docker image. Include packages, Supabase migration/test foundations, docs, scripts, artifacts, CI, Cursor hooks and root-level AGENTS.md.

ROOT ENV POLICY
Implement Part A3 exactly. Only root `.env` and root `.env.example` are allowed initially. Do not create nested env files. Add automated env-layout validation and a test that proves it rejects nested `.env*` files. Ensure root `.env` is ignored and not tracked. Configure root launch scripts to inject root env into Next.js, Python and Compose. CI must use repository secrets/variables.

PROMPT JOURNAL
Implement Part A4. Read current official Cursor Hooks documentation available in the environment if possible. Create project-level `.cursor/hooks.json` and scripts that capture `beforeSubmitPrompt` prompt text and `afterAgentResponse` assistant text into root `prompt_responses.md`. Preserve exact multiline text and Unicode; use dynamically sized Markdown fences or safe equivalent; serialize concurrent appends; test backticks and repeated events. Do not log hidden reasoning or secrets. Include timestamps and capture status. If Cursor's current installed version cannot provide these events, document MANUAL EXPORT REQUIRED and provide an exact export/append procedure. Never fabricate a transcript. Include tests and a verification command.

GIT/GITHUB SAFETY
Implement Part A5. Initialize Git if needed, create main and phase/00-foundation branch, safe .gitignore/.gitattributes, local secret scanning configuration, pre-commit or verification script, and GitHub Actions CI. Do not create an invented GitHub remote. Do not force-push or push directly to main. Commit only after inspecting staged diff and passing checks. If origin exists and auth works, push the phase branch; otherwise report exact next steps. Do not merge main.

FRONTEND FOUNDATION
Set up stable Next.js App Router, React, strict TypeScript, Tailwind, ESLint, Prettier, pnpm workspaces, Turborepo, Vitest and Playwright. Create a minimal under-development page, error boundary, not-found page and health endpoint. Do not build dashboard/design system or install speculative UI libraries.

BACKEND FOUNDATION
Set up Python 3.12, FastAPI, Pydantic settings, a maintained dependency manager with lockfile, Ruff, pytest and structured logging. Provide `/health` and `/ready`, versioned API route foundation, graceful lifecycle, structured errors and tests. Provide a separate worker process entrypoint with graceful shutdown, but no job processing yet. No Supabase, Gemini, Ollama or LangGraph integration yet.

SHARED PACKAGES
Create a minimal useful schema package with one example validation schema and test. Create planner-contracts documentation only; do not create a second planner engine.

DOCKER
Create Compose services for frontend, backend API and worker, with distinct commands/processes and health checks. Hosted Supabase is external; do not run a self-hosted Supabase stack. No required Redis or Ollama. Non-root runtime where practical. Do not mistake container start order for readiness.

DOCS AND RULES
Create README, architecture overview, development standards, testing strategy, ADRs for monorepo, hosted Supabase, separate worker and single authoritative planner. Create comprehensive AGENTS.md enforcing Part A, phase gates, visual QA, security, testing and no phase jumping.

CI
On pull requests and pushes to main, run install-from-lockfile, lint, typecheck, unit tests, build, Python lint/format/pytest, env-layout and secret checks. Do not hide failures with continue-on-error. Configure Playwright for later phases.

TEST AND REPORT
Actually install dependencies and run every available check. Start Compose if Docker is available; inspect health and logs. Run env-layout test, prompt-journal tests and secret scan. Report skipped checks honestly.

Before committing, inspect git status and full diff, stage explicit files, verify `.env` is not tracked, run all checks, commit with `chore(repo): establish monorepo foundation and safeguards`, and push the phase branch only if origin/auth are configured. Never force push.

FINAL REPORT
Include repository tree; tool versions; architecture; root env policy verification; exact journal-hook behavior and tests; Git branch/commit/remote/push status; commands/results; Docker service health; CI; env variables; known gaps; and concerns. Append your exact final response to prompt_responses.md through the hook. Stop. Do not start Phase 01.
```

**Developer verification after Phase 00:**

```bash
git status --short
git branch --show-current
git remote -v
find . -type f -name '.env*' -not -path './node_modules/*' -not -path './.git/*' -print
git ls-files | grep -E '(^|/)\.env($|\.)' || true
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:env-layout
pnpm check:prompt-journal
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs --tail=100
docker compose down
```

The `find` result should show only root `.env` and `.env.example` (plus any explicitly approved root-only example templates). `git ls-files` must never list root `.env`.

## Phase 01 — Design system and complete dashboard UI

```text
# SECOND BRAIN — PHASE 01: DESIGN SYSTEM AND FRONTEND EXPERIENCE

Read Part A of the prompt pack and AGENTS.md. Inspect the repository, journal, current branch, Git status and Phase 00 report. Implement Phase 01 only. Do not touch database/auth/backend business logic.

GOAL
Create a complete, polished, responsive frontend experience using isolated, clearly labelled development fixtures. This is a UI prototype, not a connected production product. Every visible control must have a meaningful local interaction or be clearly disabled with an explanation. Never imply data is persisted.

DESIGN
Create a distinctive quiet, minimal, editorial productivity workspace:
- Light: warm off-white canvas, subtle warm surfaces.
- Dark: deep charcoal, never pure black.
- Muted indigo/violet accent, used sparingly.
- Geist or Inter typography; deliberate type scale.
- Fine low-contrast separators; 8–12px radii; subtle shadows only when useful.
- No gratuitous gradients, excessive cards, oversized headings, fake AI sparkle motifs or excessive animation.
- Calendar is the visual centre and must have useful width.
- Today, Upcoming Work and To-Do should read as connected workspace sections, not unrelated dashboard cards.
- Strong task/event hierarchy using typography, spacing and small status indicators.
- AI assistant is a discreet floating dock/panel, not the hero.
- Quick-add supports task/event/reminder/note in a command-style interaction.
- Light/dark/system theme switch works and persists locally.
- Responsive, keyboard accessible, touch-friendly, reduced-motion aware.

USE SKILLS IF INSTALLED
Use frontend-design, ui-ux-pro-max, web-design-guidelines and react-best-practices skills when available. Do not claim a skill was used if unavailable. Use agent-browser or Playwright for browser inspection.

SCREENS/AREAS
Build:
1. Main workspace/dashboard with navigable date header, calendar (week/day/month views if practical), event/task rendering and selected-day detail.
2. Today panel/list.
3. Upcoming Work with due date/severity.
4. To-Do list with local completion, filters and priority.
5. Reminder list.
6. Quick-add command UI with type selection and validation.
7. Floating AI assistant panel with clearly labelled demo-only conversation and proposal preview; it must not write records.
8. Search/command palette UI (local fixture search only).
9. Settings area for theme, profile appearance and preferences (local-only).
10. Empty, loading, error, offline/demo and no-results states.

SKELETONS
Implement component-shaped, theme-aware skeletons: DashboardSkeleton, CalendarSkeleton, TodayPanelSkeleton, UpcomingWorkSkeleton, TodoSkeleton, ReminderSkeleton, ChatSkeleton, SearchSkeleton, SettingsSkeleton and form/profile skeletons. Avoid page-wide spinner. Preserve existing content during simulated background refresh. Use inline action progress.

ARCHITECTURE
Use reusable accessible components and a small coherent design-token system. Use a calendar library only as a presentation layer; isolate it behind an adapter so later domain data maps into it. Keep fixture data in a clearly isolated development-only module. Do not create fake API calls or pretend persistence. Do not introduce backend contracts prematurely.

TESTS
Unit-test key components/utilities and interaction behavior. Add Playwright tests for navigation, theme, quick-add local flow, calendar view controls, filters, keyboard interaction and responsive navigation. Add axe accessibility checks where practical.

MANDATORY VISUAL QA
Run the actual app in a real browser. Inspect screenshots at 360x800, 390x844, 430x932, 768x1024, 1366x768, 1440x900 and 1920x1080, in both light and dark themes. Capture key screens and states under `artifacts/screenshots/01-design-system/`. Open and visually inspect every screenshot; do not rely only on passing tests. Check overflow, spacing, text wrapping, contrast, sticky regions, calendar density, mobile navigation, console and network errors. Test keyboard and touch interactions. Fix defects and recapture. Record what was visually inspected and any remaining defects. Do not claim visual inspection if you could not actually view the screenshots.

GIT
Work on `phase/01-design-system`. Preserve user changes. Run env-layout and secret checks. Inspect staged diff. Commit with `feat(ui): build responsive Second Brain workspace design system`. Push branch only if origin/auth work. No force push and no merge.

FINAL
Append exact prompt and exact final Cursor response to prompt_responses.md. Report routes, components, design tokens, fixture boundaries, screenshots, viewport/theme matrix, accessibility results, tests, build, Git hash/push, limitations. Stop for approval; do not start Phase 02.
```

## Phase 02 — Database foundation, Supabase Auth, RLS and storage security

```text
# SECOND BRAIN — PHASE 02: SUPABASE DATA FOUNDATION AND AUTH

Read Part A, AGENTS.md and prior phase journal. Inspect existing migrations and Git status. Implement Phase 02 only. Preserve the Phase 01 UI; do not build productivity CRUD or AI.

GOAL
Establish a secure hosted-Supabase integration, migration discipline, authentication and ownership-safe RLS foundation.

DATABASE DESIGN
Design and document the canonical schema before implementing migrations. Include user/profile and device/session foundations; canonical work items; events; notes; reminders; recurrence series/exceptions; planning blocks; effort logs; auto-surface state; operation journal/batch items; notification deliveries/outbox; idempotency keys; AI approval records; attachment metadata. Create only tables needed for the schema foundation now; later phases may add columns/tables through migrations. Do not create duplicate task records for Today/Upcoming/To-Do.

Use UUID primary keys, `timestamptz` for instants, local-date semantics for all-day records, ownership-safe composite FKs/constraints, checks, unique constraints, indexes, updated-at/version fields where appropriate, audit metadata and soft-delete conventions. Define required category/severity/effort/deadline constraints explicitly. Document delete/cascade behavior.

SUPABASE
Add Supabase CLI configuration and versioned SQL migrations. Keep hosted Supabase as target; local CLI may be used for tests if Docker is available. Add generated database types and a documented regeneration process. Do not commit secrets.

AUTH
Implement Supabase Auth integration in Next.js using maintained SSR-safe patterns. Support sign-in, sign-up, sign-out, session refresh and protected route handling. Separate authenticated, verified and AI-permitted states; manual product use must not be unnecessarily blocked by AI verification. Never expose service-role key to browser. Use root `.env` only.

RLS AND STORAGE
Enable RLS on every user-owned table. Enforce ownership on every child relation, including nested rows and join tables. Storage policies must enforce owner-scoped object paths, permitted MIME types, size limits and authorization. Avoid trusting client user IDs. Use JWT-derived identity and secure server-side access. Add SQL/RLS tests for two distinct users: user A cannot read/write/update/delete user B's rows or files. Test anonymous access and ownership changes. Add negative tests for cross-user foreign-key attacks.

SECURITY
Set secure cookies and headers, validate redirect destinations, prevent open redirects, CSRF and session leakage. Keep CORS narrow. Add rate-limiting design notes. Never log tokens or secrets.

INTEGRATION
Connect UI auth states to the Phase 01 shell without redesigning it. Add proper loading, error and unauthenticated states. Do not implement task/event/note CRUD yet.

TESTING
Run migration validation, Supabase local tests where available, generated-type checks, auth integration tests and two-user RLS tests. If credentials/local Supabase are unavailable, separate tests that ran from blocked tests and provide exact setup steps; do not claim security is verified without executing isolation tests.

GIT
Branch `phase/02-supabase-auth`. Env-layout and secret scans. Review SQL carefully. Commit `feat(auth): add Supabase schema foundation and RLS-secured authentication`; push branch if configured. Never force push.

JOURNAL AND REPORT
Capture exact prompt and exact Cursor final response. Report schema, migrations, RLS matrix, storage policies, auth flow, test results, unverified cases, env variables, Git status and migration rollback concerns. Stop for approval.
```

## Phase 03 — Manual productivity core: tasks, events, notes, reminders and calendar

```text
# SECOND BRAIN — PHASE 03: MANUAL PRODUCTIVITY CORE

Read Part A, AGENTS.md, current schema, prior reports and journal. Implement only manual productivity CRUD and calendar integration. No AI, deterministic planner, notification delivery engine or offline sync.

GOAL
Make Second Brain genuinely useful without AI. Implement canonical work items/tasks, events, notes and reminder definitions with secure CRUD, validation, optimistic concurrency and a useful calendar.

DOMAIN
- A canonical work item is the only task/work record. Views are projections.
- Model category, title, description, status, severity, estimated effort, due/deadline semantics, completion and version explicitly.
- Events support timed and all-day semantics, timezone and location/description.
- Notes support safe content, timestamps and search-ready metadata.
- Reminder definitions can link to an event or work item and support absolute or event-relative schedule; delivery is a later phase.
- Use soft-delete policy consistently and ensure deleted records are not surfaced.
- Implement recurrence series and exception/override foundations now if required for correct event/task recurrence. Support “this occurrence”, “this and following”, and “all in series”; preserve original occurrence IDs and local wall time/IANA timezone. Handle DST. Prevent duplicate occurrence identity. If recurrence UI scope must be staged, implement the domain/API correctly and clearly report any UI limitation rather than faking recurrence.

API AND TRANSACTIONS
Use server-side validation, ownership checks, DB transactions and version checks. Add idempotency for retryable create/update operations. Prevent lost updates. Use stable pagination/filter/sort contracts. Keep calendar library as presentation adapter only; convert validated domain data to calendar events and map drag/drop back to explicit server mutations. Provide accessible edit form alternative to drag/drop.

UI
Connect Phase 01 screens to real authenticated data. Implement create/edit/delete/complete flows for work items, events, notes and reminder definitions. Quick-add must validate and save. Calendar supports navigation, views, selected date, event details and safe edit interactions. Show optimistic states only when rollback/error behavior is correct. Do not invent data in production; seed only isolated test fixtures.

TESTS
Unit/integration/E2E tests for each CRUD operation, validation, ownership, pagination, concurrency conflicts, recurrence/DST cases, all-day dates, calendar adapter, soft delete and idempotent retry. Test empty/error/loading states. Run two-user isolation tests.

GIT
Branch `phase/03-productivity-core`; commit `feat(core): add secure tasks events notes and calendar workflows`; push only after checks and review. Env-layout/secret checks.

JOURNAL
Append exact prompt and exact final response. Report data model, endpoints, UI routes, recurrence scope, tests and limitations. Stop for approval.
```

## Phase 04 — Today, Upcoming Work, To-Do and durable auto-surfacing

```text
# SECOND BRAIN — PHASE 04: WORKSPACE PROJECTIONS AND AUTO-SURFACING

Read Part A and all current code/schema. Implement projection and surfacing logic only; do not create duplicate task entities, planner scheduling or AI.

GOAL
Make Today, Upcoming Work and To-Do useful projections of canonical work items.

RULES
- The canonical work item remains the source of truth.
- Today/Upcoming/To-Do are query/projection views, not copied task records.
- Store dismissal/restore state separately (e.g. `auto_surface_states`), keyed by user and canonical item.
- Scheduled reconciliation must be idempotent and must not resurrect dismissed work.
- Due-date/severity changes recalculate eligibility without erasing dismissal history.
- Provide manual restore and clear audit behavior.
- Initial severity defaults: Critical surfaces 7 days before due; High 3 days; Medium 1 day; Low never. Severity-only rules for MVP; category-specific rules later.
- Handle overdue, completed, cancelled, deleted, no-due-date and timezone boundaries explicitly.
- Explain why an item appears in a section (e.g. due soon, overdue, manually pinned) and why it is excluded when relevant.

IMPLEMENTATION
Create a deterministic server-side eligibility/projection service and efficient queries/indexes. Trigger recalculation on relevant canonical mutations and provide a scheduled reconciliation path. Ensure both paths are idempotent. Do not duplicate business rules in frontend. UI must show source item identity and link to canonical detail/edit. Support dismissal, restore and manual pin if defined in UX.

TESTS
Test all severity windows and boundary dates, timezone transitions, due-date/severity changes, dismiss persistence across repeated reconciliation, manual restore, completion/cancellation/deletion, idempotency and concurrent updates. Verify no duplicate task records. Add integration and Playwright tests.

VISUAL QA
Inspect updated panels at the seven required viewport sizes and both themes. Capture/inspect screenshots under `artifacts/screenshots/04-auto-surface/`; check dense/empty/overdue states, keyboard and mobile behavior.

GIT/JOURNAL
Branch `phase/04-auto-surface`; run env-layout, secret scan, tests and visual QA; commit `feat(workspace): add deterministic work surfacing and projections`; push branch if configured. Append exact prompt and final Cursor response. Report eligibility table, state transitions, reconciliation behavior, tests, screenshots and limitations. Stop for approval.
```

## Phase 05 — Deterministic planning engine and ghost blocks

```text
# SECOND BRAIN — PHASE 05: DETERMINISTIC PLANNER

Read Part A, especially planner and approval requirements. Inspect schema, API and calendar adapter. Implement deterministic planning only. AI must not schedule or invent time slots.

AUTHORITATIVE ENGINE
Choose exactly one authoritative implementation location (recommended: Python backend planner service). Expose a versioned, typed API contract. TypeScript may validate/consume the contract but must not implement a second scheduling algorithm. Document this ADR.

DATA
Use separate `planning_blocks` (not ordinary events) and `task_effort_logs`. Planned time is not completed effort. Effort logs/completion events are authoritative for actual completed work. A planning block has task reference, start/end instants, timezone context, status, source, version and ownership.

INPUTS
Consider calendar busy time, protected hours, preferred planning windows, working hours, breaks, task effort estimate, logged effort, completion state, deadline/safety deadline, priority/severity, existing future active planning blocks, daily load and timezone. Distinguish free calendar availability from preferred planning windows.

ALGORITHM
- Deterministic, explainable and testable.
- Compute remaining effort from estimate and authoritative effort logs.
- Count only future active planning blocks; exclude cancelled/obsolete/completed blocks as appropriate.
- Do not double-count completed effort.
- Respect protected hours, breaks, daily load, calendar conflicts and preferred windows.
- Return explicit overdue, infeasible and insufficient-capacity outcomes.
- Never create negative planning horizons or arbitrary one-hour clamps.
- Use documented deterministic scoring and tie-breaking.
- Avoid scheduling past deadlines or overlapping blocks.
- Account for timezone and DST.
- Do not claim planned blocks are completed work.

PROPOSALS
Generate ghost blocks in a preview only; do not persist them until explicit user approval. Show why each slot was chosen, capacity impact, deadline feasibility and alternatives. On apply, revalidate all source versions, conflicts, capacity and ownership in one transaction. Reject stale proposals and ask for regeneration. Use idempotency.

UI
Integrate a planning preview in calendar with clear visual distinction between persisted events and unpersisted ghost blocks. Accessible approve/reject/edit flow. No AI-generated scheduling.

TESTS
Property/boundary tests for overlap, capacity, breaks, protected time, completed effort, existing blocks, overdue, insufficient capacity, timezone/DST, deterministic repeatability, stale versions and concurrent apply. Include realistic adversarial cases. Ensure frontend does not duplicate algorithm.

VISUAL QA
Inspect preview/approved/rejected/infeasible states at all required viewports/themes; capture and inspect screenshots under `artifacts/screenshots/05-planner/`.

GIT/JOURNAL
Branch `phase/05-planner`; commit `feat(planner): add deterministic capacity-aware planning`; push if configured. Append exact prompt and final response. Report algorithm, contract, invariants, tests, visual QA and limitations. Stop for approval.
```

## Phase 06 — Reminder delivery, transactional outbox and worker

```text
# SECOND BRAIN — PHASE 06: REMINDER DELIVERY PIPELINE

Read Part A and inspect reminder definitions, event recurrence and worker foundations. Implement delivery pipeline only. Do not add AI or offline sync.

OUTBOX
Use transactional outbox: reminder mutation and enqueue must commit atomically. Worker claims jobs atomically (PostgreSQL `FOR UPDATE SKIP LOCKED` or equivalent), with leases/claim expiry so crashed workers do not strand jobs. Use unique delivery/idempotency keys and per-channel `notification_deliveries` plus attempt history. Track queued, claimed, sent/accepted, delivered where provider confirms, failed, retrying and dead-letter states distinctly. Enqueue is not delivery. Do not promise exactly-once provider delivery; design idempotent at-least-once processing.

RETRIES
Implement bounded retries with exponential backoff and jitter, provider-aware retryability, timeouts, dead-letter inspection/replay and operational logs. Protect against duplicate concurrent workers and duplicate recurrence reminders. Idempotent acknowledge and snooze operations.

TIME
Timezone-aware scheduling and quiet hours, including overnight windows. Event-relative reminders recalculate when event time/timezone changes. Recurrence instances must have unique reminder occurrence identity. Handle DST gaps/folds deliberately and document policy.

CHANNELS
Implement in-app notifications first, then email and Web Push using maintained providers/libraries. Provider credentials come only from root `.env` or deployment secrets. Never log tokens, push subscriptions or email contents unnecessarily. Add unsubscribe/preferences and delivery failure visibility. If provider credentials are unavailable, implement interfaces and tests but clearly mark real external delivery as unverified; do not fake success.

WORKER
Run worker as a distinct process/container from API. Add graceful shutdown, heartbeat/metrics, bounded concurrency, backpressure and health/readiness. PostgreSQL is durable source of truth; Redis not required.

TESTS
Test atomic enqueue, crash/reclaim, concurrent claims, duplicate deliveries, idempotency, retry/dead-letter, provider timeout, quiet hours, overnight windows, timezone/DST, rescheduling and snooze/ack replay. Use provider fakes only in tests and label them. Verify actual in-app flow.

GIT/JOURNAL
Branch `phase/06-reminders`; commit `feat(notifications): add transactional reminder delivery pipeline`; push if configured. Append exact prompt and exact final response. Report delivery semantics, channels actually tested, worker health, metrics, failures and credential gaps. Stop for approval.
```

## Phase 07 — AI assistant, LangGraph, Gemini/Ollama and approval system

```text
# SECOND BRAIN — PHASE 07: AI ASSISTANT WITH EXPLICIT APPROVAL

Read Part A and inspect all current APIs, canonical schemas, planner and security controls. Implement AI assistant only. Never let AI become the source of truth or silently mutate user data.

ARCHITECTURE
Use FastAPI backend and LangGraph for orchestration. Gemini is primary provider; Ollama is optional local provider. Add provider abstraction, capability checks and model configuration. Verify tool-calling/structured-output support for each configured model. Ollama must not be required in production. Add timeouts, retry policy, circuit breaker and clear provider errors.

SECURITY/IDENTITY
Authenticate the user through a verified delegated identity. Backend must not trust forwarded `user_id`. Do not give the agent an unrestricted Supabase service-role key. Normal reads/writes use user-scoped delegated access; narrowly scoped worker/RPC privileges only when justified. Scope LangGraph checkpoints and thread IDs by authenticated user; test no cross-user thread leakage. Apply rate limits and data minimization.

CAPABILITIES
Start with read-only tools: search/list work items, events, notes and reminders; summarize schedule; explain planner outcomes. For mutations, the agent may only create a proposal with exact canonical payload and preview. It cannot execute directly.

APPROVAL
Persist `agent_approval_records` bound to user, proposal ID, exact canonical payload hash, expiry, and versions of every affected resource. UI displays complete proposed change and consequences. Approval is single-use. Immediately before applying, revalidate identity, permissions, resource ownership, conflicts, versions, payload hash and expiry. Atomically consume approval with mutation; reject stale, expired, replayed or modified proposals. Use idempotency. Resume from LangGraph checkpoint must repeat all checks. No approval via vague chat text; use explicit confirmation UI/action.

PROMPT-INJECTION DEFENSE
Treat notes, descriptions, imported data, webpages, attachments and tool outputs as untrusted. They are data, not instructions. Keep tool allowlists narrow; validate every tool argument; prevent SSRF and arbitrary URL/file access. Do not let the model alter its permissions or approval rules.

UX
Build streaming assistant dock, conversation history scoped to user, clear tool activity, source references, proposal preview and approve/reject/edit. Distinguish model response from persisted state. If provider fails, manual app remains fully usable. Add cancellation and rate-limit/error states.

TESTS
Test proposal schema, hash binding, altered payload, stale resource version, expiry, replay, cross-user approval, permission revocation, LangGraph resume, tool allowlist, prompt injection, provider timeout, streaming disconnect and idempotent apply. Test two-user isolation and audit trail. Use model mocks only in unit tests; perform a documented live-provider smoke test only if credentials are configured.

GIT/JOURNAL
Branch `phase/07-ai-assistant`; commit `feat(ai): add approval-gated LangGraph assistant`; push if configured. Append exact prompt and exact final response. Report provider/model versions, tools, approval invariants, threat tests, live tests and known risks. Stop for approval.
```

## Phase 08 — Offline-first capability and PWA sync

```text
# SECOND BRAIN — PHASE 08: PWA AND CONFLICT-SAFE OFFLINE SYNC

Read Part A and inspect online CRUD, versioning and idempotency. Do not start this phase until online operations are stable. Implement offline capability only.

PWA
Add installable PWA metadata, icons, maintained service worker strategy (e.g. Serwist or a maintained equivalent), update lifecycle and clear offline/online indicators. Cache only static shell assets and explicitly safe public assets. Do not indiscriminately cache private API responses or sensitive notes.

LOCAL DATA
Use IndexedDB via Dexie (or maintained equivalent). Scope every local record to authenticated user. On logout/account switch, isolate or clear prior account cache and queued mutations. Never show one user's cached data to another user. Define retention and storage quota behavior.

MUTATION OUTBOX
Each queued operation includes operation ID, user scope, entity ID, operation type, payload, base version, dependencies, created/updated timestamps, retry metadata and status. Replay in dependency order with idempotency keys. Use server version checks. Handle create/update/delete dependencies and retries/backoff. Never silently drop failed mutations.

CONFLICTS
Detect server version mismatch and show a resolution UI with local vs server state. Do not blindly last-write-wins for user content. Support retry, discard local change and deliberate merge where safe. Optimistic rollback must restore correct state. Preserve user edits. Surface validation and authorization errors.

LIMITATIONS
Be honest about browser background execution, push/local notification limits and sync timing. Do not promise sync while browser is closed unless platform/provider support proves it. Avoid false “synced” indicators.

TESTS
Playwright offline/online transitions, queued mutation, ordered replay, duplicate retry, dependency chain, conflict resolution, logout/account switching, cache isolation, quota/storage errors, service-worker update and reconnect. Use browser context isolation for two accounts.

VISUAL QA
Inspect offline, pending, conflict and reconnect states at all required viewport sizes and themes. Capture/inspect screenshots under `artifacts/screenshots/08-offline/`.

GIT/JOURNAL
Branch `phase/08-offline`; commit `feat(pwa): add user-isolated offline mutation sync`; push if configured. Append exact prompt and final response. Report browser/platform limitations and actual offline tests. Stop for approval.
```

## Phase 09 — Search, command palette, keyboard navigation and accessibility

```text
# SECOND BRAIN — PHASE 09: SEARCH, COMMAND PALETTE AND ACCESSIBILITY

Read Part A and inspect current product behavior. Implement search, navigation and accessibility improvements only; do not redesign the entire product.

SEARCH
Create a documented search contract across work items, events, notes and reminders. Enforce ownership and RLS. Add pagination, ranking, filters, date ranges and stable sorting. Escape user query input and protect against expensive wildcard queries. Use PostgreSQL full-text search/trigram only where justified. Search results link to canonical records; no duplicate entities.

COMMAND PALETTE
Provide keyboard shortcut (document it), searchable navigation/actions, quick-add, open record and supported safe commands. Destructive or mutating actions require confirmation. Do not expose actions the current user cannot perform. Support focus management and screen readers.

ACCESSIBILITY
Audit WCAG 2.2 AA: semantic landmarks, heading hierarchy, labels, keyboard-only flows, focus visibility, focus trapping/restoration, dialog semantics, contrast, reduced motion, touch targets, live-region announcements, error identification, form instructions and accessible calendar alternatives. Calendar interactions must have keyboard/form alternatives. Do not use color alone for status.

TESTS
Search ranking/pagination/ownership; keyboard command palette; shortcuts; focus management; screen-reader labels; axe checks; reduced-motion; high zoom; responsive touch; no-results/error states.

VISUAL QA
Inspect all required viewports and both themes. Capture/inspect screenshots under `artifacts/screenshots/09-search-accessibility/`. Test keyboard-only workflows and accessibility tree, not only screenshots.

GIT/JOURNAL
Branch `phase/09-search-accessibility`; commit `feat(ux): add global search command palette and accessibility`; push if configured. Append exact prompt and final response. Report accessibility findings and unresolved issues. Stop for approval.
```

## Phase 10 — Security, performance, reliability and recovery audit

```text
# SECOND BRAIN — PHASE 10: SECURITY AND RELIABILITY HARDENING

Act as an independent security/reliability reviewer. Read Part A, all ADRs, schema, API, UI, workers and prior journal entries. Do not add unrelated features. First produce a prioritized audit plan, then fix confirmed issues in scope and test each fix.

SECURITY
Audit authentication/session lifecycle, authorization and RLS on every user-owned table/child, storage paths, service credentials, agent delegated identity, approval replay, CSRF, CORS, CSP, XSS, SSRF, open redirects, injection, rate limits, brute force, upload MIME/signature/size/scanning/quota, secret leakage, logging, dependency vulnerabilities and prompt injection. Test two-user isolation end-to-end. Check that no service-role secret enters browser bundles. Check that AI cannot bypass approval.

DATA/RELIABILITY
Audit transaction boundaries, idempotency, optimistic versions, recurrence uniqueness, timezone/DST, worker lease/reclaim, outbox duplicate handling, dead-letter recovery, offline replay, conflict resolution, export/delete completeness, audit trail and cascade behavior. Test crash/restart and partial failures.

PERFORMANCE
Measure frontend bundle and Core Web Vitals, API p50/p95, DB query plans/index use, N+1 behavior, calendar loading, search pagination, worker throughput and memory. Add indexes only with evidence. Avoid premature caching and private-data cache leakage.

BACKUP/RECOVERY
Document Supabase backup options and actual configured retention. Create and execute a restore drill in a safe non-production environment if credentials permit. Test migration forward/recovery process. Do not run destructive migrations against production. Document RPO/RTO assumptions and gaps.

OBSERVABILITY
Structured logs with correlation IDs, metrics and traces where practical. Redact secrets and sensitive content. Add health/readiness and actionable alerts/runbooks. Avoid logging note contents or tokens.

TESTS
Add regression tests for every fixed issue, security tests, load/performance smoke tests, dependency audit and migration checks. Do not claim a penetration test occurred unless an actual test was performed by an authorized tool/person.

REPORT
Prioritize findings by severity, show evidence, fixes and residual risk. Include exact test outputs and what was not tested.

GIT/JOURNAL
Branch `phase/10-hardening`; commit `fix(security): harden authorization data integrity and reliability`; push if configured. Append exact prompt and exact final response. Stop for approval before production deployment.
```

## Phase 11 — Production deployment, CI/CD, backups and release

```text
# SECOND BRAIN — PHASE 11: PRODUCTION DEPLOYMENT AND RELEASE

Read Part A, architecture/operations docs, security audit and all prior reports. Deploy only after Phase 10 critical/high findings are resolved or explicitly accepted by the owner.

TARGET
Deploy Next.js frontend, FastAPI backend API and separate worker as independent processes/services. Use Docker images, Caddy or managed ingress with TLS, hosted Supabase and a supported hosting platform. Do not assume a particular cloud account or invent credentials. Ask for missing provider/project details before provisioning or changing paid resources.

ENVIRONMENT SEPARATION
Create dev/staging/prod configuration through deployment platform secrets, not nested env files. Repository still permits only root local `.env` and `.env.example`; no deployment `.env` files in repo. Ensure secrets are scoped by environment and least privilege. Never print secrets.

CI/CD
Build/test on PR. Deploy staging after merge to protected main. Production deployment requires explicit approval/manual environment gate. Pin image tags to commit SHA, maintain rollback path, run migrations as a controlled one-off job before compatible app rollout, and verify health after deployment. Never automatically run destructive schema changes.

CONTAINERS/NETWORK
Use non-root images, minimal runtime, health checks, resource limits where supported, secure headers, TLS, narrow ingress, private backend/worker networking and explicit service-to-service authentication. Worker must not be publicly exposed unnecessarily. Configure Caddy only if self-managed ingress is chosen.

OPERATIONS
Set up logs, metrics, error tracking and uptime checks. Configure database backups/PITR if available, retention, restore runbook and periodic restore drill. Document secrets rotation, incident response, data export/deletion, migration rollback and worker dead-letter replay.

RELEASE
Run production build, unit/integration/E2E, RLS security suite, smoke tests, accessibility checks and migration validation. Deploy staging first. Run smoke tests and inspect actual UI at required viewports/themes against deployed staging. Production release only after explicit user approval. Do not claim production is live unless deployment URL and health checks prove it.

GIT
Branch `phase/11-release`; use release tag/versioning only after approval. Commit `chore(release): prepare production deployment`; push branch if configured. No force push. Main merge/release requires owner approval.

FINAL REPORT
Include architecture and provider choices, exact URLs, image digests, commit SHA, migration status, secrets configured by name only, CI/CD results, backup/restore evidence, monitoring, rollback procedure, known risks, cost/usage considerations and release checklist. Append exact prompt and exact final Cursor response. Stop and wait for explicit production approval.
```

---

# Part C — One-time setup instructions

## C1. Create and open the repository

```bash
mkdir second-brain
cd second-brain
git init
git branch -M main
cursor .
```

If `cursor` is not on PATH, open Cursor and choose **File → Open Folder**.

Check prerequisites:

```bash
node --version
npm --version
python3 --version
docker --version
docker compose version
```

Use a supported Node.js LTS release, Python 3.12 and Docker Compose. Install `pnpm` using the current official pnpm installation method for your Node version.

## C2. Install a small set of agent skills

Run from the repository root in Cursor's terminal. Verify each skill's current repository instructions before installing; do not assume every repository exposes identical skill names.

```bash
npx skills add anthropics/claude-code --skill frontend-design
npx skills add nextlevelbuilder/ui-ux-pro-max-skill
npx skills add vercel-labs/agent-skills --skill react-best-practices
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add vercel-labs/agent-skills --skill agent-browser
```

If an install command fails, do not improvise an untrusted source. Read the repository's installation instructions and report the exact failure. Restart the Cursor Agent session after installation so it can discover the skills.

## C3. Configure GitHub

Create an empty GitHub repository yourself, then add its actual URL:

```bash
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git remote -v
```

Authenticate using GitHub CLI or your approved credential manager. Never paste a GitHub token into a prompt, source file or `.env.example`. Confirm authentication:

```bash
gh auth status
```

If you use SSH, verify your SSH key with GitHub. Keep `main` protected and require CI checks before merging.

## C4. Put the prompt pack inside the repository before Phase 00

After creating the folder, copy this downloaded file into the repository:

```bash
mkdir -p docs/prompts
cp ~/Downloads/second_brain_cursor_prompt_pack.md docs/prompts/second_brain_cursor_prompt_pack.md
```

Adjust the source path if your browser saved it somewhere else. Keep this prompt pack tracked in Git. Phase 00 uses this exact source to bootstrap the journal entry for the first prompt, because the project hooks cannot capture a prompt submitted before they were installed.

## C5. Run phases in order

1. Paste Phase 00 into Cursor Agent.
2. Wait for its final report.
3. Verify the commands and Git diff yourself.
4. Check `prompt_responses.md` contains the exact prompt and exact response.
5. Review screenshots for UI phases.
6. Confirm the phase branch and commit were pushed (if origin is configured).
7. Share the report and any errors for review.
8. Only then proceed to the next phase.

Do not paste all phase prompts at once.

---

# Part D — Human verification checklist for every phase

- [ ] Cursor implemented only the requested phase.
- [ ] Full prompt is present in `prompt_responses.md`.
- [ ] Exact Cursor final response is present, not a rewritten summary.
- [ ] Capture status is honest (`HOOK VERIFIED` or `MANUAL EXPORT REQUIRED`).
- [ ] No secrets appear in prompts, journal, Git diff or logs.
- [ ] Only root `.env` and approved root templates exist.
- [ ] Root `.env` is ignored and not tracked.
- [ ] `git status` and staged diff were inspected.
- [ ] Lint, typecheck, unit, integration and relevant E2E tests were actually run.
- [ ] UI phases: screenshots were opened and visually inspected at all seven sizes and both themes.
- [ ] Security/RLS changes: two-user isolation tests were actually run.
- [ ] Commit message is meaningful and phase-scoped.
- [ ] Phase branch is pushed if GitHub origin/authentication are configured.
- [ ] No force push or direct push to main occurred.
- [ ] Engineering report, limitations and unresolved risks are reviewed.
- [ ] Explicit approval was given before starting the next phase.

**Important:** A passing test suite does not prove visual quality, and a generated report does not prove a test ran. Verify the evidence.
