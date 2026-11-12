# ADR 0003 — Separate worker process

## Status

Accepted (Phase 00)

## Context

Reminder delivery and other background work must survive API restarts and must not run inside request handlers. A thread inside the API process would hide crashes and make scaling unclear.

## Decision

Ship one Python package and one backend image. Run two processes from it:

- API: `uvicorn second_brain.api.app:app`
- Worker: `python -m second_brain.worker`

Each process has its own health and readiness endpoints. Phase 00's worker waits for SIGTERM or SIGINT and does not claim jobs. PostgreSQL will be the durable queue later. Redis is not required.

## Consequences

- Compose defines `backend` and `worker` as different services with different commands.
- Readiness is the health check, not container start order.
- Future job code belongs in the worker module, with the API only enqueueing work inside the same database transaction as the user mutation.
