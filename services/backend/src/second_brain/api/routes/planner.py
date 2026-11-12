"""Versioned planner API. Slot choice lives in second_brain.planner.engine."""

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from second_brain.errors import AppError
from second_brain.planner.engine import PlanProposal, PlanRequest, plan

router = APIRouter(prefix="/api/v1/planner", tags=["planner"])


class ApplyRequest(BaseModel):
    approved_hash: str
    proposal_id: UUID
    plan: PlanRequest


@router.post("/preview", response_model=PlanProposal)
def preview(body: PlanRequest) -> PlanProposal:
    return plan(body)


@router.post("/apply", response_model=PlanProposal)
def apply_plan(body: ApplyRequest) -> PlanProposal:
    result = plan(body.plan)
    if result.payload_hash != body.approved_hash or result.proposal_id != body.proposal_id:
        raise AppError(
            "stale_proposal",
            "This proposal is stale. Generate it again.",
            409,
        )
    if not result.blocks:
        raise AppError("nothing_to_apply", "There are no blocks to save.", 422)
    return result
