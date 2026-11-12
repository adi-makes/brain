# ADR 0004 — One authoritative planner

## Status

Accepted. Implemented in the Python planner (`services/backend/src/second_brain/planner/engine.py`). The contract and the rules are in `packages/planner-contracts` and `docs/architecture/planner.md`.

## Context

Scheduling rules are easy to fork by accident: a TypeScript preview that "mostly" matches a Python apply path will create slots the server then rejects, or worse, persist a different plan than the one the user approved.

## Decision

There is one planner implementation, in the Python backend, exposed through `POST /api/v1/planner/preview` and `POST /api/v1/planner/apply`. Both routes call the same function. `packages/planner-contracts` validates that response. It must not contain scoring, slot search, or capacity math. The frontend may validate responses and render ghost blocks. It may not invent times.

## Consequences

- A second algorithm in TypeScript is a defect, even if it is only used for optimistic UI.
- AI may explain planner output. It may not create planning blocks or replace the deterministic scores.
- Ghost blocks stay unpersisted until the user approves that payload hash. A stale hash is rejected and must be generated again.
