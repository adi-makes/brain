"""Deterministic planner. This is the only scheduling implementation.

Scoring, in order:
1. Free time inside the preferred window, earliest start first.
2. Other free working time, earliest start first.
3. The same start keeps the longer segment.

Duration is the UTC elapsed time between instants. Adding minutes is done in
UTC, so a daylight-saving gap is not treated as work time. An ambiguous
fall-back time uses fold 0, the earlier offset. There is no one-hour minimum
and no invented horizon. Weekdays use Monday as 0.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID, uuid5
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field

PROPOSAL_NAMESPACE = UUID("6f0d3c2e-7b1a-4e5d-9c44-2a8f0b6e1d30")


class WorkItemInput(BaseModel):
    id: UUID
    title: str
    status: str
    severity: str
    estimate_minutes: int | None
    due_on: date | None = None
    due_at: datetime | None = None
    version: int


class EffortLogInput(BaseModel):
    id: UUID
    minutes: int
    version: int


class EventInput(BaseModel):
    id: UUID
    version: int
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    all_day: bool = False
    starts_on: date | None = None
    ends_on: date | None = None


class PlanningBlockInput(BaseModel):
    id: UUID
    work_item_id: UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    version: int


class ProtectedHour(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time


class PreferencesInput(BaseModel):
    version: int = 1
    working_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    work_start: time = time(9, 0)
    work_end: time = time(17, 0)
    break_start: time = time(12, 0)
    break_minutes: int = 30
    preferred_start: time = time(9, 0)
    preferred_end: time = time(12, 0)
    daily_load_minutes: int = 240
    safety_lead_days: int = 1
    protected: list[ProtectedHour] = Field(default_factory=list)


class PlanRequest(BaseModel):
    as_of: datetime
    timezone: str
    work_item: WorkItemInput
    effort_logs: list[EffortLogInput] = Field(default_factory=list)
    events: list[EventInput] = Field(default_factory=list)
    planning_blocks: list[PlanningBlockInput] = Field(default_factory=list)
    preferences: PreferencesInput = Field(default_factory=PreferencesInput)


class GhostBlock(BaseModel):
    starts_at: datetime
    ends_at: datetime
    minutes: int
    timezone: str
    local_date: date
    local_start: str
    local_end: str
    reason: str
    in_preferred_window: bool
    daily_minutes_after: int


class Alternative(BaseModel):
    summary: str
    starts_at: datetime | None = None
    reason: str


class PlanProposal(BaseModel):
    proposal_id: UUID
    payload_hash: str
    outcome: str
    summary: str
    blocks: list[GhostBlock]
    alternatives: list[Alternative]
    remaining_minutes: int
    reserved_minutes: int
    scheduled_minutes: int
    unscheduled_minutes: int
    horizon_minutes: int
    safety_deadline: datetime | None
    deadline: datetime | None
    versions: dict[str, object]


class Segment:
    def __init__(self, start: datetime, end: datetime, preferred: bool) -> None:
        self.start = start
        self.end = end
        self.preferred = preferred

    @property
    def minutes(self) -> int:
        return _elapsed_minutes(self.start, self.end)


def plan(request: PlanRequest) -> PlanProposal:
    try:
        zone = ZoneInfo(request.timezone)
    except ZoneInfoNotFoundError:
        return _finish(
            request, "infeasible", "The timezone is not recognized.", [], 0, 0, 0, None, None
        )
    as_of = _aware(request.as_of)
    if request.work_item.status in {"done", "cancelled"}:
        return _finish(
            request,
            "infeasible",
            "Completed or cancelled work is not planned.",
            [],
            0,
            0,
            0,
            None,
            None,
        )
    if request.work_item.estimate_minutes is None:
        return _finish(
            request,
            "infeasible",
            "Add an effort estimate before planning.",
            [],
            0,
            0,
            0,
            None,
            None,
        )
    if request.preferences.daily_load_minutes <= 0:
        return _finish(
            request, "infeasible", "Daily load must be greater than zero.", [], 0, 0, 0, None, None
        )
    deadline = _deadline(request, zone)
    if deadline is None:
        return _finish(
            request, "infeasible", "Add a deadline before planning.", [], 0, 0, 0, None, None
        )
    safety = deadline - timedelta(days=request.preferences.safety_lead_days)
    horizon = _elapsed_minutes(as_of, deadline)
    if horizon <= 0:
        return _finish(
            request,
            "overdue",
            "The deadline has passed, so nothing new is scheduled.",
            [],
            0,
            0,
            0,
            safety,
            deadline,
        )
    logged = sum(item.minutes for item in request.effort_logs)
    remaining = max(0, request.work_item.estimate_minutes - logged)
    reserved = _reserved_minutes(request, as_of)
    unscheduled = max(0, remaining - reserved)
    if unscheduled == 0:
        if remaining == 0:
            summary = "There is no remaining effort to plan."
        else:
            summary = "Future planned time already covers the remaining effort."
        return _finish(
            request, "already_planned", summary, [], remaining, reserved, 0, safety, deadline
        )

    segments = _free_segments(request, zone, as_of, deadline)
    preferred = [item for item in segments if item.preferred]
    other = [item for item in segments if not item.preferred]
    blocks, used = _place(request, zone, preferred, unscheduled, as_of)
    more, used_more = _place(
        request,
        zone,
        other,
        unscheduled - used,
        as_of,
        extra_daily=_daily_used(blocks),
    )
    blocks.extend(more)
    scheduled = used + used_more
    alternatives = _alternative(request, zone, preferred + other, blocks, unscheduled, as_of)
    left = unscheduled - scheduled
    if scheduled == 0:
        return _finish(
            request,
            "insufficient_capacity",
            "No free working time remains before the deadline.",
            [],
            remaining,
            reserved,
            0,
            safety,
            deadline,
            alternatives,
        )
    if left > 0:
        note = "Part of the work does not fit before the deadline."
        if safety < deadline and blocks[-1].ends_at > safety:
            note = (
                "Part of the work misses the safety deadline and does not fit "
                "before the real deadline."
            )
        return _finish(
            request,
            "insufficient_capacity",
            note,
            blocks,
            remaining,
            reserved,
            scheduled,
            safety,
            deadline,
            alternatives,
        )
    summary = "The remaining effort fits before the deadline."
    if any(block.ends_at > safety for block in blocks):
        summary = "The work fits before the deadline and part of it is after the safety deadline."
    return _finish(
        request,
        "feasible",
        summary,
        blocks,
        remaining,
        reserved,
        scheduled,
        safety,
        deadline,
        alternatives,
    )


def _place(
    request: PlanRequest,
    zone: ZoneInfo,
    segments: list[Segment],
    needed: int,
    as_of: datetime,
    extra_daily: dict[date, int] | None = None,
) -> tuple[list[GhostBlock], int]:
    if needed <= 0:
        return [], 0
    used_day = _existing_daily(request, zone, as_of)
    for day, minutes in (extra_daily or {}).items():
        used_day[day] = used_day.get(day, 0) + minutes
    blocks: list[GhostBlock] = []
    left = needed
    ordered = sorted(
        (item for item in segments if item.minutes > 0),
        key=lambda item: (item.start, -item.minutes),
    )
    for segment in ordered:
        if left <= 0:
            break
        day = segment.start.astimezone(zone).date()
        room = request.preferences.daily_load_minutes - used_day.get(day, 0)
        take = min(left, segment.minutes, room)
        if take <= 0:
            continue
        end = _shift(segment.start, take)
        if end <= segment.start:
            continue
        used_day[day] = used_day.get(day, 0) + take
        where = (
            "Earliest free time inside the preferred window."
            if segment.preferred
            else "Preferred time was not enough, so this uses other working time."
        )
        reason = (
            f"{where} This places {take} minutes and brings that day to "
            f"{used_day[day]} of {request.preferences.daily_load_minutes}."
        )
        local = segment.start.astimezone(zone)
        local_end = end.astimezone(zone)
        blocks.append(
            GhostBlock(
                starts_at=segment.start,
                ends_at=end,
                minutes=take,
                timezone=request.timezone,
                local_date=local.date(),
                local_start=local.strftime("%H:%M"),
                local_end=local_end.strftime("%H:%M"),
                reason=reason,
                in_preferred_window=segment.preferred,
                daily_minutes_after=used_day[day],
            )
        )
        left -= take
    return blocks, needed - left


def _alternative(
    request: PlanRequest,
    zone: ZoneInfo,
    segments: list[Segment],
    chosen: list[GhostBlock],
    needed: int,
    as_of: datetime,
) -> list[Alternative]:
    if not chosen or not segments:
        return []
    first = chosen[0].ends_at
    later = [item for item in segments if item.start >= first]
    blocks, _used = _place(request, zone, later, needed, as_of)
    if not blocks:
        return [
            Alternative(
                summary="No later slot fits the remaining effort.",
                reason="The next free time is after the deadline or the daily load.",
            )
        ]
    return [
        Alternative(
            summary="Start at the next free segment instead of the earliest one.",
            starts_at=blocks[0].starts_at,
            reason="It loses the tie because it starts later.",
        )
    ]


def _free_segments(
    request: PlanRequest, zone: ZoneInfo, as_of: datetime, deadline: datetime
) -> list[Segment]:
    busy = _busy(request, zone, as_of, deadline)
    segments: list[Segment] = []
    day = as_of.astimezone(zone).date()
    last = deadline.astimezone(zone).date()
    while day <= last:
        if day.weekday() in request.preferences.working_days:
            start = _local(day, request.preferences.work_start, zone)
            end = _local(day, request.preferences.work_end, zone)
            start = max(start, as_of)
            end = min(end, deadline)
            if end > start:
                open_segments = _subtract(start, end, busy)
                preferred_start = _local(day, request.preferences.preferred_start, zone)
                preferred_end = _local(day, request.preferences.preferred_end, zone)
                for item in open_segments:
                    segments.extend(
                        _split_preferred(item[0], item[1], preferred_start, preferred_end)
                    )
        day += timedelta(days=1)
    return segments


def _split_preferred(
    start: datetime, end: datetime, preferred_start: datetime, preferred_end: datetime
) -> list[Segment]:
    result: list[Segment] = []
    overlap_start = max(start, preferred_start)
    overlap_end = min(end, preferred_end)
    if overlap_end > overlap_start:
        if overlap_start > start:
            result.append(Segment(start, overlap_start, False))
        result.append(Segment(overlap_start, overlap_end, True))
        if end > overlap_end:
            result.append(Segment(overlap_end, end, False))
    else:
        result.append(Segment(start, end, False))
    return [item for item in result if item.minutes > 0]


def _busy(
    request: PlanRequest, zone: ZoneInfo, as_of: datetime, deadline: datetime
) -> list[tuple[datetime, datetime]]:
    intervals: list[tuple[datetime, datetime]] = []
    for event in request.events:
        if event.all_day and event.starts_on and event.ends_on:
            day = event.starts_on
            while day <= event.ends_on:
                intervals.append(
                    (
                        _local(day, request.preferences.work_start, zone),
                        _local(day, request.preferences.work_end, zone),
                    )
                )
                day += timedelta(days=1)
        elif event.starts_at and event.ends_at and _aware(event.ends_at) > _aware(event.starts_at):
            intervals.append((_aware(event.starts_at), _aware(event.ends_at)))
    for block in request.planning_blocks:
        if block.status == "active":
            intervals.append((_aware(block.starts_at), _aware(block.ends_at)))
    day = as_of.astimezone(zone).date()
    last = deadline.astimezone(zone).date()
    while day <= last:
        if (
            day.weekday() in request.preferences.working_days
            and request.preferences.break_minutes > 0
        ):
            break_start = _local(day, request.preferences.break_start, zone)
            intervals.append((break_start, _shift(break_start, request.preferences.break_minutes)))
        for item in request.preferences.protected:
            if item.weekday == day.weekday() and item.end > item.start:
                intervals.append((_local(day, item.start, zone), _local(day, item.end, zone)))
        day += timedelta(days=1)
    return intervals


def _subtract(
    start: datetime, end: datetime, busy: list[tuple[datetime, datetime]]
) -> list[tuple[datetime, datetime]]:
    pieces = [(start, end)]
    for busy_start, busy_end in busy:
        next_pieces: list[tuple[datetime, datetime]] = []
        for piece_start, piece_end in pieces:
            if busy_end <= piece_start or busy_start >= piece_end:
                next_pieces.append((piece_start, piece_end))
                continue
            if busy_start > piece_start:
                next_pieces.append((piece_start, busy_start))
            if busy_end < piece_end:
                next_pieces.append((busy_end, piece_end))
        pieces = [
            (item_start, item_end) for item_start, item_end in next_pieces if item_end > item_start
        ]
    return pieces


def _reserved_minutes(request: PlanRequest, as_of: datetime) -> int:
    total = 0
    for block in request.planning_blocks:
        if block.work_item_id != request.work_item.id or block.status != "active":
            continue
        start = max(_aware(block.starts_at), as_of)
        end = _aware(block.ends_at)
        if end > start:
            total += _elapsed_minutes(start, end)
    return total


def _existing_daily(request: PlanRequest, zone: ZoneInfo, as_of: datetime) -> dict[date, int]:
    used: dict[date, int] = {}
    for block in request.planning_blocks:
        if block.status != "active" or _aware(block.ends_at) <= as_of:
            continue
        _add_minutes(used, max(_aware(block.starts_at), as_of), _aware(block.ends_at), zone)
    return used


def _add_minutes(used: dict[date, int], start: datetime, end: datetime, zone: ZoneInfo) -> None:
    cursor = start
    while cursor < end:
        local = cursor.astimezone(zone)
        next_midnight = _local(local.date() + timedelta(days=1), time(0, 0), zone)
        piece_end = min(end, next_midnight)
        used[local.date()] = used.get(local.date(), 0) + _elapsed_minutes(cursor, piece_end)
        cursor = piece_end


def _daily_used(blocks: list[GhostBlock]) -> dict[date, int]:
    used: dict[date, int] = {}
    for block in blocks:
        used[block.local_date] = used.get(block.local_date, 0) + block.minutes
    return used


def _deadline(request: PlanRequest, zone: ZoneInfo) -> datetime | None:
    if request.work_item.due_at is not None:
        return _aware(request.work_item.due_at)
    if request.work_item.due_on is not None:
        return _local(request.work_item.due_on + timedelta(days=1), time(0, 0), zone)
    return None


def _local(day: date, clock: time, zone: ZoneInfo) -> datetime:
    return datetime.combine(day, clock, tzinfo=zone)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=ZoneInfo("UTC"))
    return value


def _elapsed_minutes(start: datetime, end: datetime) -> int:
    delta = _aware(end).astimezone(UTC) - _aware(start).astimezone(UTC)
    return int(delta.total_seconds() // 60)


def _shift(start: datetime, minutes: int) -> datetime:
    shifted = _aware(start).astimezone(UTC) + timedelta(minutes=minutes)
    return shifted.astimezone(start.tzinfo)


def _finish(
    request: PlanRequest,
    outcome: str,
    summary: str,
    blocks: list[GhostBlock],
    remaining: int,
    reserved: int,
    scheduled: int,
    safety: datetime | None,
    deadline: datetime | None,
    alternatives: list[Alternative] | None = None,
) -> PlanProposal:
    horizon = 0
    if deadline is not None:
        horizon = max(0, _elapsed_minutes(_aware(request.as_of), deadline))
    versions: dict[str, object] = {
        "work_item": {"id": str(request.work_item.id), "version": request.work_item.version},
        "events": [{"id": str(item.id), "version": item.version} for item in request.events],
        "planning_blocks": [
            {"id": str(item.id), "version": item.version} for item in request.planning_blocks
        ],
        "effort_logs": [
            {"id": str(item.id), "version": item.version} for item in request.effort_logs
        ],
        "preferences": request.preferences.version,
    }
    body = {
        "outcome": outcome,
        "blocks": [block.model_dump(mode="json") for block in blocks],
        "work_item_id": str(request.work_item.id),
        "work_item_version": request.work_item.version,
    }
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(encoded.encode()).hexdigest()
    return PlanProposal(
        proposal_id=uuid5(PROPOSAL_NAMESPACE, digest),
        payload_hash=digest,
        outcome=outcome,
        summary=summary,
        blocks=blocks,
        alternatives=alternatives or [],
        remaining_minutes=remaining,
        reserved_minutes=reserved,
        scheduled_minutes=scheduled,
        unscheduled_minutes=max(0, remaining - reserved - scheduled),
        horizon_minutes=horizon,
        safety_deadline=safety,
        deadline=deadline,
        versions=versions,
    )
