# Planner contracts

This package validates the planner API. It does not choose times.

The only scheduler is `services/backend/src/second_brain/planner/engine.py`. `POST /api/v1/planner/preview` returns a proposal. `POST /api/v1/planner/apply` runs that same function again and rejects the call when the payload hash differs. TypeScript may parse the response with `parsePlanProposal` and render the `local_start` and `local_end` values. It must not search for another slot.

See `docs/decisions/0004-single-authoritative-planner.md` and `docs/architecture/planner.md`.
