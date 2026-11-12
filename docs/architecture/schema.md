# Canonical schema

Phase 02 foundation. Today, Upcoming Work, and To-Do are not tables. They are later projections of `work_items`. This migration creates the ownership-safe tables those projections, the planner, reminders, and approvals will use. It does not implement their behavior.

Instants are `timestamptz`. All-day values are `date` columns and mean a local calendar date, not a UTC midnight. Recurring series also store an IANA timezone and a local wall-clock time.

Every user-owned row carries `owner_id`. Parents also have `unique (owner_id, id)`. Children reference that pair, so a row owned by A cannot point at a parent owned by B. Client-supplied user ids are not trusted: row-level security compares `owner_id` with `auth.uid()`.

## Identity

| Table          | Purpose                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`     | One row per `auth.users` id. Display name, timezone, week start, density, and `ai_permitted`. Created by a trigger. Email verification stays on `auth.users` and is not copied here. |
| `user_devices` | Product device list: label, last seen, revoked time. Supabase Auth still owns the real session. This table does not store access tokens.                                             |

`ai_permitted` defaults to false. A verified email does not turn it on. Manual use does not read this flag.

## Work, time, and notes

| Table                   | Purpose                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work_items`            | The only task record. Category, severity, open/done/cancelled, optional local `due_on` or instant `due_at`, and an estimate in minutes.                                                           |
| `events`                | Timed or all-day calendar events. Optional link to a recurrence series and the original occurrence date.                                                                                          |
| `notes`                 | Standalone, or attached to one work item or one event.                                                                                                                                            |
| `reminders`             | One schedule mode: an instant, a local date, or an offset from an event.                                                                                                                          |
| `recurrence_series`     | Frequency, interval, timezone, local start, and either an until-date or a count.                                                                                                                  |
| `recurrence_exceptions` | Skip, cancel, or override one original occurrence date.                                                                                                                                           |
| `planning_blocks`       | Time reserved for a work item. Not a calendar event. Status is active, completed, cancelled, or obsolete. Unapproved ghost blocks are not stored.                                                 |
| `task_effort_logs`      | Completed effort. Planned time is not a row here.                                                                                                                                                 |
| `auto_surface_states`   | Dismissal and restore for one work item, plus the eligibility signature that was current when the person dismissed it. Reconciliation must not delete this row just because the due date changed. |

Allowed category: `personal`, `home`, `work`, `admin`, `learning`.

Allowed severity: `critical`, `high`, `medium`, `low`.

A work item has at most one deadline shape. `due_on` is the all-day local date. `due_at` is a timed instant. Estimates are from 0 to 14 days in minutes. Effort log minutes are greater than 0 and at most 24 hours.

## Operations and delivery

| Table                     | Purpose                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `operation_batches`       | A group of related writes.                                                                                                      |
| `operation_journal`       | Before/after snapshots and the version produced by the write. `undone_at` records a later undo.                                 |
| `operation_batch_items`   | Join from a batch to a journal row, both owned by the same person.                                                              |
| `notification_outbox`     | Durable intent to deliver. Enqueueing is not delivery. Claims are for a later worker.                                           |
| `notification_deliveries` | One attempt of an outbox row.                                                                                                   |
| `idempotency_keys`        | One stored result per owner and key.                                                                                            |
| `ai_approval_records`     | User, proposal id, SHA-256 payload hash, resource versions, expiry, and single-use consumed time. No model calls in this phase. |
| `attachments`             | Metadata for one private storage object. The object path is `{owner_id}/{attachment_id}`.                                       |

## Delete and cascade

Hard delete follows the foreign keys. Soft delete sets `deleted_at` and leaves the row in place so the owner can restore it. Policies do not hide soft-deleted rows from their owner. Later projections must filter `deleted_at`.

| When this is deleted  | What happens                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.users`          | `profiles` cascades.                                                                                                                                  |
| `profiles`            | Owned rows cascade. A trigger deletes `storage.objects` under `attachments/{user id}/`.                                                               |
| `work_items`          | Notes, reminders, planning blocks, effort logs, auto-surface state, and attachments that point at it cascade.                                         |
| `events`              | Linked reminders, notes, and attachments cascade.                                                                                                     |
| `recurrence_series`   | Exceptions and events that point at the series cascade.                                                                                               |
| `operation_batches`   | Batch items cascade. Journal rows that only point at the batch are restricted from leaving a dangling batch id: the journal foreign key cascades too. |
| `notification_outbox` | Delivery attempts cascade.                                                                                                                            |
| `reminders`           | Outbox rows for that reminder cascade.                                                                                                                |

Changing `owner_id` is rejected by a trigger as well as by row-level security. Primary keys do not change.

## Rollback

Supabase migrations are forward-only. Rolling this foundation back is a new migration that drops policies, the storage bucket, triggers, and tables in child-to-parent order, then the functions. Do not edit this file after it has been applied to a hosted project. A hosted project that applied it and then needs a different shape gets a later migration.

Applying the migration to a database that already has these names will fail. There is no production data in this repository yet.
