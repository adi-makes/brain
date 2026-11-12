# ADR 0002 — Hosted Supabase

## Status

Accepted (Phase 00). Integration starts in Phase 02.

## Context

The product needs PostgreSQL, authentication, realtime, and object storage for a single-user MVP. Operating a database cluster inside Compose is extra surface area and would diverge from production.

## Decision

Use hosted Supabase for PostgreSQL, Auth, Realtime, and Storage. Do not run the Supabase local stack from Compose. `supabase/` holds migrations, tests, and CLI configuration for later phases. Service-role credentials stay in root `.env` or deployment secrets and are never exposed as `NEXT_PUBLIC_` values.

## Consequences

- Local Phase 00 does not require a Supabase project.
- Phase 02 must add migrations, generated types, and two-user RLS tests before any product data is stored.
- Backup and restore depend on the hosted project's plan. That is an operations item for the release phase, not something this repository can prove yet.
