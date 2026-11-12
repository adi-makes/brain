# Migrations

`20261112120000_foundation.sql` is the Phase 02 schema, row-level security, and attachment bucket. The design is `docs/architecture/schema.md`.

Apply it to the hosted project with `pnpm exec supabase db push` after `supabase link`. Do not edit a migration that has already been applied. Add a new file instead.

There is no down migration. Rollback is a later migration that drops children before parents and removes `attachments` objects.
