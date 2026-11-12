# Work projections

Today, Upcoming Work, and To-Do are queries over `work_items`. They are not tables and they do not copy tasks. `public.surface_decision` is the only eligibility rule. The screen reads `surface_section`, `surface_reason`, and `excluded_reason` from `list_work_projections`.

The local date is `due_on`, or `due_at` converted in the profile timezone. Today is the profile-timezone date of the `p_as_of` instant. A bad timezone falls back to UTC for that conversion.

| Severity | Surfaces when the local due date is        |
| -------- | ------------------------------------------ |
| Critical | within 7 days, including today and overdue |
| High     | within 3 days, including today and overdue |
| Medium   | within 1 day, including today and overdue  |
| Low      | never, unless the item is pinned           |

A due date inside the window and after today is Upcoming, reason `Due soon`. Today is `Due today`. A past due date is `Overdue`. Anything else stays on To-Do with an exclusion reason: no due date, low severity, outside the window, completed, cancelled, or dismissed.

Pin sets `pinned_at` and shows the item on Today as `Manually pinned`. Dismiss sets `dismissed_at` and stores `eligibility_signature`. A later pin wins over an older dismiss. Restore sets `restored_at` and leaves the old timestamps in place. An older pin becomes active again after restore.

`reconcile_auto_surface` updates `current_eligibility` and `last_reconciled_at` when the calculated window changed. It does not change dismissal, restore, pin, or the signature. The same is true of `reconcile_auto_surface_all`, which is the scheduled entry. The worker names that function and does not open a database connection. A work-item insert or update runs the same reconcile for that row.

Dismiss, restore, pin, and unpin write one `operation_journal` row with the before and after state. A repeated idempotency key returns the first result and does not write again. A stale `surface_version` raises `P0002`.

The list returns at most 500 work items. `truncated` is true when the account has more.
