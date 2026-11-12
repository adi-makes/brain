# ADR 0002 — Hosted Supabase

## Status

Accepted (Phase 00). Integration starts in Phase 02.

## Context

The product needs PostgreSQL, authentication, realtime, and object storage for a single-user MVP. Operating a database cluster inside Compose is extra surface area and would diverge from production.

## Decision

Use hosted Supabase for PostgreSQL, Auth, Realtime, and Storage. Do not run the Supabase local stack from Compose. `supabase/` holds migrations, tests, and CLI configuration for later phases. Service-role credentials stay in root `.env` or deployment secrets and are never exposed as `NEXT_PUBLIC_` values.

## Consequences

- Local development of the fixture UI does not require a Supabase project. Auth stays unconfigured until the root `.env` has the project URL and anon key.
- Phase 02 adds the foundation migration, generated type check, and two-user RLS tests. Run `pnpm db:test` before calling isolation verified.
- The service-role key stays in the root `.env` or deployment secrets. The Next.js app does not read it.
- Backup and restore depend on the hosted project's plan. That is an operations item for the release phase, not something this repository can prove yet.
