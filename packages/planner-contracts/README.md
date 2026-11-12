# Planner contracts

This package is documentation only. It does not contain a planner implementation.

The deterministic planner has one authoritative engine. Phase 05 will put that engine in the Python backend and expose a versioned API. TypeScript may validate and display the contract. It must not grow a second scheduling algorithm.

Phase 00 does not define request or response payloads. Those land with the planner phase, in this package as types or schema files that mirror the Python API, after the API exists.

See `docs/decisions/0004-single-authoritative-planner.md`.
