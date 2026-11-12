# Database tests

`rls_isolation.sql` is a pgTAP file. `pnpm db:test` runs it against the local Supabase database. It creates two users, then checks that user A cannot read, update, or delete user B's rows, that a cross-user foreign key is rejected, that anonymous access is rejected, and that a file cannot be written under another user's path.

The test is not a hosted-project penetration test. Hosted verification is `supabase db push` plus the same SQL behavior after the migration is applied.
