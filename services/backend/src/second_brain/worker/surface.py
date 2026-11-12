"""Scheduled auto-surface reconciliation.

Eligibility stays in Postgres. This module only names the function a schedule
should call. It does not calculate windows and it does not open a database
connection.
"""

from __future__ import annotations

RECONCILE_FUNCTION = "public.reconcile_auto_surface_all"
INTERVAL_SECONDS = 300


def schedule_status() -> dict[str, object]:
    return {
        "function": RECONCILE_FUNCTION,
        "interval_seconds": INTERVAL_SECONDS,
        "database_connected": False,
    }
