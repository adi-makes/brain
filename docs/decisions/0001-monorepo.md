# ADR 0001 — Monorepo with separate frontend and backend roots

## Status

Accepted (Phase 00)

## Context

The product has a Next.js client, a FastAPI API, a worker, and shared contracts. Splitting repositories now would duplicate CI, env policy, and the prompt journal.

## Decision

Keep one Git repository. Put the web app in `apps/frontend` and the Python service in `services/backend`. Share TypeScript contracts through `packages/`. Use pnpm workspaces and Turborepo for JavaScript. Use uv for Python. JavaScript and Python keep separate lockfiles and toolchains.

## Consequences

- One pull request can change a contract and both callers, which makes review of boundary changes easier.
- Docker builds use the repository root as context so workspace packages are available.
- The backend is not a pnpm package. Root scripts call `uv` explicitly.
