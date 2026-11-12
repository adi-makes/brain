import random
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from fastapi.testclient import TestClient

from second_brain.api.app import create_app
from second_brain.planner.engine import (
    EffortLogInput,
    EventInput,
    PlanningBlockInput,
    PlanRequest,
    PreferencesInput,
    ProtectedHour,
    WorkItemInput,
    plan,
)

ITEM = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")


def _item(**overrides: object) -> WorkItemInput:
    values: dict[str, object] = {
        "id": ITEM,
        "title": "Draft the notes",
        "status": "open",
        "severity": "high",
        "estimate_minutes": 60,
        "due_on": date(2026, 11, 13),
        "version": 3,
    }
    values.update(overrides)
    return WorkItemInput.model_validate(values)


def _request(**overrides: object) -> PlanRequest:
    values: dict[str, object] = {
        "as_of": datetime(2026, 11, 12, 8, 0, tzinfo=UTC),
        "timezone": "UTC",
        "work_item": _item(),
    }
    values.update(overrides)
    return PlanRequest.model_validate(values)


def _utc_minutes(start: datetime, end: datetime) -> int:
    return int((end.astimezone(UTC) - start.astimezone(UTC)).total_seconds() // 60)


def _minutes(result_blocks: list[object]) -> int:
    return sum(block.minutes for block in result_blocks)  # type: ignore[attr-defined]


def test_places_the_earliest_preferred_slot_and_repeats() -> None:
    first = plan(_request())
    second = plan(_request())
    assert first.outcome == "feasible"
    assert first.payload_hash == second.payload_hash
    assert first.proposal_id == second.proposal_id
    assert len(first.blocks) == 1
    assert first.blocks[0].minutes == 60
    assert first.blocks[0].local_start == "09:00"
    assert first.blocks[0].local_end == "10:00"
    assert first.blocks[0].in_preferred_window is True
    assert first.horizon_minutes > 0
    assert first.scheduled_minutes == 60
    assert first.unscheduled_minutes == 0


def test_logged_effort_reduces_remaining_and_completed_blocks_do_not() -> None:
    result = plan(
        _request(
            work_item=_item(estimate_minutes=90),
            effort_logs=[EffortLogInput(id=UUID(int=1), minutes=60, version=1)],
            planning_blocks=[
                PlanningBlockInput(
                    id=UUID(int=2),
                    work_item_id=ITEM,
                    starts_at=datetime(2026, 11, 11, 9, 0, tzinfo=UTC),
                    ends_at=datetime(2026, 11, 11, 10, 0, tzinfo=UTC),
                    status="completed",
                    version=1,
                )
            ],
        )
    )
    assert result.remaining_minutes == 30
    assert result.reserved_minutes == 0
    assert result.scheduled_minutes == 30
    assert result.blocks[0].minutes == 30


def test_future_active_blocks_reserve_time_and_cancelled_blocks_do_not() -> None:
    result = plan(
        _request(
            work_item=_item(estimate_minutes=90),
            planning_blocks=[
                PlanningBlockInput(
                    id=UUID(int=3),
                    work_item_id=ITEM,
                    starts_at=datetime(2026, 11, 12, 9, 0, tzinfo=UTC),
                    ends_at=datetime(2026, 11, 12, 9, 30, tzinfo=UTC),
                    status="active",
                    version=2,
                ),
                PlanningBlockInput(
                    id=UUID(int=4),
                    work_item_id=ITEM,
                    starts_at=datetime(2026, 11, 12, 10, 0, tzinfo=UTC),
                    ends_at=datetime(2026, 11, 12, 11, 0, tzinfo=UTC),
                    status="cancelled",
                    version=1,
                ),
            ],
        )
    )
    assert result.reserved_minutes == 30
    assert result.scheduled_minutes == 60
    assert result.blocks[0].local_start == "09:30"
    assert result.blocks[0].local_end == "10:30"
    assert result.blocks[0].minutes == 60


def test_a_short_gap_is_not_expanded_to_an_hour() -> None:
    result = plan(
        _request(
            work_item=_item(estimate_minutes=20),
            events=[
                EventInput(
                    id=UUID(int=5),
                    version=1,
                    starts_at=datetime(2026, 11, 12, 9, 20, tzinfo=UTC),
                    ends_at=datetime(2026, 11, 12, 17, 0, tzinfo=UTC),
                )
            ],
        )
    )
    assert result.outcome == "feasible"
    assert result.blocks[0].minutes == 20
    assert result.blocks[0].local_end == "09:20"


def test_daily_load_stops_the_day_without_inventing_a_horizon() -> None:
    result = plan(
        _request(
            work_item=_item(estimate_minutes=90, due_on=date(2026, 11, 16)),
            preferences=PreferencesInput(daily_load_minutes=30),
        )
    )
    assert [block.minutes for block in result.blocks] == [30, 30, 30]
    assert len({block.local_date for block in result.blocks}) == 3
    assert result.outcome == "feasible"


def test_break_and_protected_hours_split_the_day() -> None:
    result = plan(
        _request(
            work_item=_item(estimate_minutes=150),
            preferences=PreferencesInput(
                break_start=time(10, 0),
                break_minutes=30,
                preferred_start=time(9, 0),
                preferred_end=time(12, 0),
                protected=[ProtectedHour(weekday=3, start=time(11, 0), end=time(12, 0))],
            ),
        )
    )
    spans = [(block.local_date, block.local_start, block.local_end) for block in result.blocks]
    assert spans == [
        (date(2026, 11, 12), "09:00", "10:00"),
        (date(2026, 11, 12), "10:30", "11:00"),
        (date(2026, 11, 13), "09:00", "10:00"),
    ]
    assert result.blocks[-1].in_preferred_window is True


def test_preferred_time_beats_an_earlier_open_afternoon() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 12, 13, 0, tzinfo=UTC),
            work_item=_item(estimate_minutes=60, due_on=date(2026, 11, 13)),
        )
    )
    assert result.blocks[0].local_date == date(2026, 11, 13)
    assert result.blocks[0].local_start == "09:00"
    assert result.blocks[0].in_preferred_window is True
    assert result.alternatives[0].starts_at is not None


def test_overdue_has_no_horizon_and_no_blocks() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 14, 8, 0, tzinfo=UTC),
            work_item=_item(due_on=date(2026, 11, 13)),
        )
    )
    assert result.outcome == "overdue"
    assert result.blocks == []
    assert result.horizon_minutes == 0
    assert result.scheduled_minutes == 0


def test_missing_estimate_or_deadline_is_infeasible() -> None:
    missing_estimate = plan(_request(work_item=_item(estimate_minutes=None)))
    missing_deadline = plan(_request(work_item=_item(due_on=None, due_at=None)))
    assert missing_estimate.outcome == "infeasible"
    assert missing_deadline.outcome == "infeasible"
    assert missing_estimate.blocks == []
    assert missing_deadline.blocks == []


def test_partial_fit_is_insufficient_capacity_and_stops_at_the_deadline() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 13, 16, 0, tzinfo=UTC),
            work_item=_item(
                estimate_minutes=120,
                due_on=None,
                due_at=datetime(2026, 11, 13, 16, 30, tzinfo=UTC),
            ),
        )
    )
    assert result.outcome == "insufficient_capacity"
    assert result.scheduled_minutes == 30
    assert result.unscheduled_minutes == 90
    assert result.blocks[0].ends_at == datetime(2026, 11, 13, 16, 30, tzinfo=UTC)


def test_all_day_event_blocks_the_working_day() -> None:
    result = plan(
        _request(
            events=[
                EventInput(
                    id=UUID(int=6),
                    version=1,
                    all_day=True,
                    starts_on=date(2026, 11, 12),
                    ends_on=date(2026, 11, 13),
                )
            ],
        )
    )
    assert result.outcome == "insufficient_capacity"
    assert result.blocks == []


def test_spring_forward_uses_real_elapsed_time() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 3, 8, 5, 0, tzinfo=UTC),
            timezone="America/New_York",
            work_item=_item(estimate_minutes=120, due_on=date(2026, 3, 8)),
            preferences=PreferencesInput(
                working_days=[6],
                work_start=time(1, 0),
                work_end=time(4, 0),
                break_minutes=0,
                preferred_start=time(1, 0),
                preferred_end=time(4, 0),
            ),
        )
    )
    assert result.outcome == "feasible"
    assert result.blocks[0].minutes == 120
    assert result.blocks[0].local_end == "04:00"
    assert _utc_minutes(result.blocks[0].starts_at, result.blocks[0].ends_at) == 120


def test_fall_back_keeps_the_first_occurrence() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 1, 4, 0, tzinfo=UTC),
            timezone="America/New_York",
            work_item=_item(estimate_minutes=180, due_on=date(2026, 11, 1)),
            preferences=PreferencesInput(
                working_days=[6],
                work_start=time(1, 0),
                work_end=time(3, 0),
                break_minutes=0,
                preferred_start=time(1, 0),
                preferred_end=time(3, 0),
                daily_load_minutes=240,
            ),
        )
    )
    assert result.blocks[0].minutes == 180
    assert result.blocks[0].local_end == "03:00"
    assert _utc_minutes(result.blocks[0].starts_at, result.blocks[0].ends_at) == 180


def test_kolkata_deadline_uses_the_local_day() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 12, 20, 0, tzinfo=UTC),
            timezone="Asia/Kolkata",
            work_item=_item(estimate_minutes=60, due_on=date(2026, 11, 13)),
        )
    )
    assert result.blocks[0].local_date == date(2026, 11, 13)
    assert result.blocks[0].local_start == "09:00"
    assert result.blocks[0].starts_at == datetime(2026, 11, 13, 3, 30, tzinfo=UTC)


def test_safety_deadline_does_not_hide_a_feasible_real_deadline() -> None:
    result = plan(
        _request(
            as_of=datetime(2026, 11, 13, 8, 0, tzinfo=UTC),
            work_item=_item(estimate_minutes=60, due_on=date(2026, 11, 13)),
            preferences=PreferencesInput(safety_lead_days=1),
        )
    )
    assert result.outcome == "feasible"
    assert result.safety_deadline is not None
    assert result.blocks[0].ends_at > result.safety_deadline
    assert "safety deadline" in result.summary


def test_done_work_zero_load_and_unknown_zone_do_not_schedule() -> None:
    assert plan(_request(work_item=_item(status="done"))).outcome == "infeasible"
    assert (
        plan(_request(preferences=PreferencesInput(daily_load_minutes=0))).outcome == "infeasible"
    )
    assert plan(_request(timezone="Not/AZone")).outcome == "infeasible"
    covered = plan(
        _request(
            work_item=_item(estimate_minutes=10),
            effort_logs=[EffortLogInput(id=UUID(int=7), minutes=40, version=1)],
        )
    )
    assert covered.outcome == "already_planned"
    assert covered.blocks == []
    assert covered.scheduled_minutes == 0


def test_generated_cases_stay_inside_the_invariants() -> None:
    rng = random.Random(5)
    for index in range(24):
        as_of = datetime(2026, 11, 12, 8, 0, tzinfo=UTC) + timedelta(hours=rng.randint(0, 30))
        estimate = rng.choice([None, 0, 15, 20, 45, 90, 240, 500])
        due = date(2026, 11, 12) + timedelta(days=rng.randint(-1, 4))
        request = _request(
            as_of=as_of,
            work_item=_item(estimate_minutes=estimate, due_on=due),
            preferences=PreferencesInput(
                daily_load_minutes=rng.choice([15, 30, 90, 240]),
                break_minutes=rng.choice([0, 15, 30]),
                protected=[
                    ProtectedHour(weekday=rng.randint(0, 4), start=time(15, 0), end=time(16, 0))
                ],
            ),
            events=[
                EventInput(
                    id=UUID(int=100 + index),
                    version=1,
                    starts_at=as_of + timedelta(hours=2),
                    ends_at=as_of + timedelta(hours=3),
                )
            ],
        )
        result = plan(request)
        assert plan(request).payload_hash == result.payload_hash
        assert result.horizon_minutes >= 0
        assert result.scheduled_minutes == _minutes(result.blocks)
        assert result.unscheduled_minutes >= 0
        assert result.scheduled_minutes <= max(
            0, result.remaining_minutes - result.reserved_minutes
        )
        previous_end = None
        for block in result.blocks:
            assert block.minutes > 0
            assert block.ends_at - block.starts_at == timedelta(minutes=block.minutes)
            assert block.starts_at >= as_of
            assert result.deadline is None or block.ends_at <= result.deadline
            if previous_end is not None:
                assert block.starts_at >= previous_end
            previous_end = block.ends_at
        if result.outcome == "overdue":
            assert result.blocks == []
            assert result.horizon_minutes == 0


def test_apply_rejects_a_stale_hash_and_accepts_the_same_proposal() -> None:
    body = _request().model_dump(mode="json")
    with TestClient(create_app()) as client:
        preview = client.post("/api/v1/planner/preview", json=body)
        assert preview.status_code == 200
        proposal = preview.json()
        fresh = client.post(
            "/api/v1/planner/apply",
            json={
                "approved_hash": proposal["payload_hash"],
                "proposal_id": proposal["proposal_id"],
                "plan": body,
            },
        )
        stale = client.post(
            "/api/v1/planner/apply",
            json={
                "approved_hash": "0" * 64,
                "proposal_id": proposal["proposal_id"],
                "plan": body,
            },
        )
        empty = client.post(
            "/api/v1/planner/apply",
            json={
                "approved_hash": plan(
                    _request(work_item=_item(estimate_minutes=None))
                ).payload_hash,
                "proposal_id": str(
                    plan(_request(work_item=_item(estimate_minutes=None))).proposal_id
                ),
                "plan": _request(work_item=_item(estimate_minutes=None)).model_dump(mode="json"),
            },
        )
    assert fresh.status_code == 200
    assert fresh.json()["payload_hash"] == proposal["payload_hash"]
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "stale_proposal"
    assert empty.status_code == 422
