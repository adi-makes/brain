# Deterministic planner

The only scheduler is `services/backend/src/second_brain/planner/engine.py`. `POST /api/v1/planner/preview` and `POST /api/v1/planner/apply` both call that function. Apply returns 409 when the new payload hash or proposal id differs from the approved one. The Next.js server loads the rows, calls that API, and renders the returned local times. `packages/planner-contracts` parses the response. It does not search for a slot. SQL inserts the approved instants after it rechecks versions, ownership, idempotency, and overlap. SQL does not score a time.

Planned time is a row in `planning_blocks`. Completed work is a row in `task_effort_logs`. A planning block is not an event and it is not completed effort.

## Inputs

The request carries the profile timezone, the instant "as of", the work item, effort logs, events, planning blocks, and preferences. Free working time and the preferred window are different. The preferred window is tried first. Other working time is used only when preferred time cannot hold the remaining effort, and the block says so.

When no preference row exists, the request uses these defaults: Monday–Friday (Monday is 0), 09:00–17:00, a 30-minute break at 12:00, a preferred window of 09:00–12:00, 240 minutes of daily load, one safety-lead day, and no protected hours.

## Scoring

1. Free time inside the preferred window, earliest start first.
2. Other free working time, earliest start first.
3. The same start keeps the longer segment.

A placed block takes the minimum of the remaining effort, the free segment, and the room left in that day's load. There is no one-hour minimum. A deadline in the past produces `overdue`, zero blocks, and a horizon of zero. A missing estimate, a missing deadline, a finished task, a zero daily load, or an unknown timezone produces `infeasible` and zero blocks. Work that starts but cannot finish produces `insufficient_capacity` and only the blocks that fit. Nothing is placed after the deadline or on top of a busy interval.

Busy time is a timed event, the working window of an all-day event, an active planning block, the daily break, and a protected hour. Cancelled, obsolete, and completed blocks do not reserve time and do not count as effort. Remaining effort is the estimate minus effort-log minutes, and never below zero. Only the future portion of an active block for this task is reserved. That reserved time is not subtracted again from the logs.

Duration is the UTC difference between instants. Adding minutes is done in UTC, so a spring-forward gap is not work time. An ambiguous fall-back time uses fold 0, the earlier offset. A date-only deadline ends at the next local midnight. The safety deadline is that deadline minus the safety lead. Work may sit after the safety deadline when it still ends by the real deadline, and the summary says so.

The proposal id is a UUID derived from the payload hash. The same input produces the same id and hash. The hash covers the outcome, the work item id and version, and each block. An alternative, when one exists, is the same placement starting at the next free segment. It is an explanation, not a second plan.

## Approval

Ghost blocks stay in the browser until Approve. Approve reloads the rows, calls `/apply`, and then calls `apply_planning_proposal` in one database transaction. The transaction locks the work item, rejects a version mismatch, rejects a new effort log or planning block that was not in the snapshot, rejects overlap with an event or an active block, and stores the Python instants with source `planner` and status `active`. The same idempotency key and request returns the original rows. A different request with that key is rejected. A direct database call can still insert an owner-scoped block; the screen does not send times of its own.

Changing the daily load or the preferred window asks for a new preview. It does not move a ghost on the client.
