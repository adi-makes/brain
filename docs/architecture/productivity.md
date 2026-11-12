# Manual productivity

Phase 03 writes tasks, events, notes, and reminder definitions. Today, Upcoming Work, and To-Do stay projections of `work_items`. The screen filters them. It does not store a second task.

The write path is a Postgres function called by a Next.js server action with the signed-in session. Row-level security still applies. The function sets `owner_id` from `auth.uid()`. The browser does not send an owner id. FastAPI is not this API. It remains the later agent and worker host.

## Calls

| Function                                                                                                     | What it does                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `create_work_item`, `update_work_item`, `set_work_item_status`, `soft_delete_work_item`, `restore_work_item` | Task writes. Status `done` sets `completed_at`. Any other status clears it.   |
| `create_event`, `update_event`, `soft_delete_event`                                                          | One event, or a series. Update and delete take `one`, `following`, or `all`.  |
| `create_note`, `update_note`, `soft_delete_note`                                                             | Note text. A note has at most one parent.                                     |
| `create_reminder`, `update_reminder`, `soft_delete_reminder`                                                 | A definition only. Nothing is delivered.                                      |
| `list_work_items`                                                                                            | Pages of 1–100 rows, newest first, cursor `(created_at, id)`.                 |
| `list_events_between`                                                                                        | Inclusive local dates, at most 400 days, with a two-day pad for timed events. |
| `list_notes`                                                                                                 | Title and body search. Soft-deleted parents are hidden.                       |
| `list_reminders`                                                                                             | Active definitions whose parent, if any, is not soft-deleted.                 |

A list never returns `deleted_at` rows. The owner can still read a soft-deleted row directly, and `restore_work_item` clears that timestamp. The workspace does not show a restore control.

## Concurrency

Updates require the version the client last read. A mismatch raises `P0002` and does not write. The version trigger bumps `version` on every update.

Create and update accept an idempotency key of 8–200 characters. The function hashes the arguments. The same key and hash return the stored response. The same key with a different hash raises `P0003`. Keys expire after 24 hours.

## Recurrence

A series stores frequency, interval, IANA timezone, the anchor date, and either an end date, a count, or neither. With neither, materializing stops 18 months after the start. Occurrence dates are calculated from the anchor, not from the previous date, so 31 January monthly stays on the month-end rather than drifting to the 28th.

Each occurrence is one `events` row. `(owner_id, series_id, occurrence_on)` is unique, including soft-deleted rows, so a second materialize cannot create a second identity. Local start time is stored on the series. The row's `starts_at` is that wall time in the series timezone. Around a daylight-saving change, 09:00 stays 09:00 and the UTC offset changes.

`one` updates that event and records an `override` exception. `following` moves that occurrence and later ones onto a new series, keeps their event ids and occurrence dates, and ends the old series the day before. `all` updates the series template and every occurrence that is not already an override. Cancelling an occurrence soft-deletes the event and records a `cancel` exception so it is not recreated.

Frequency and interval do not change after creation. Quick add can create a daily or weekly series of eight occurrences. Monthly, yearly, an end date, and a custom count are available to `create_event` and are covered by the database tests. The quick-add form does not expose those controls.

## What this phase does not do

Reminder delivery, planning blocks, effort logs, auto-surface dismissal, undo, offline sync, and assistant writes are later phases. The operation journal is not filled in by these functions. A timed event that crosses midnight is rejected. Dragging a timed event moves it in 15-minute steps and saves with scope `one`. The edit form is the other way to change it.
