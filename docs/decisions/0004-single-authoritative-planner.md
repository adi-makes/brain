# ADR 0004 — One authoritative planner

## Status

Accepted (Phase 00). The engine is not implemented yet.

## Context

Scheduling rules are easy to fork by accident: a TypeScript preview that "mostly" matches a Python apply path will create slots the server then rejects, or worse, persist a different plan than the one the user approved.

## Decision

There will be one planner implementation, in the Python backend, exposed through a versioned API. `packages/planner-contracts` documents and later types that contract. It must not contain scoring, slot search, or capacity math. The frontend may validate responses and render ghost blocks. It may not invent times.

## Consequences

- Phase 05 implements the engine once, with property tests on the Python side.
- A second algorithm in TypeScript is a defect, even if it is only used for optimistic UI.
- AI may explain planner output. It may not create planning blocks or replace the deterministic scores.
