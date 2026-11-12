import type { PlanView } from "../calendar/plan-display";
import type { PreviewMode } from "../demo/types";
import type { WorkspaceRecord } from "../productivity/types";

const overrides = { dailyLoadMinutes: 240, preferredStart: "09:00", preferredEnd: "12:00" };

function block(today: string, persisted: boolean) {
  return {
    id: "preview-plan-block",
    title: "Draft the notes",
    date: today,
    start: "09:00",
    end: "10:00",
    minutes: 60,
    reason:
      "Earliest free time inside the preferred window. This places 60 minutes and brings that day to 60 of 240.",
    persisted,
  };
}

export function planFixture(mode: PreviewMode, today: string): PlanView | null {
  if (
    mode !== "plan" &&
    mode !== "plan-approved" &&
    mode !== "plan-rejected" &&
    mode !== "plan-infeasible"
  ) {
    return null;
  }
  if (mode === "plan-infeasible") {
    return {
      fixture: true,
      status: "preview",
      outcome: "infeasible",
      summary: "Add an effort estimate before planning.",
      remainingMinutes: 0,
      reservedMinutes: 0,
      scheduledMinutes: 0,
      unscheduledMinutes: 0,
      alternatives: [],
      blocks: [],
      proposalId: "00000000-0000-4000-8000-000000000005",
      payloadHash: "preview-infeasible",
      idempotencyKey: "preview-infeasible",
      workItemId: "preview-plan",
      overrides,
    };
  }
  const rejected = mode === "plan-rejected";
  return {
    fixture: true,
    status: rejected ? "rejected" : mode === "plan-approved" ? "approved" : "preview",
    outcome: "feasible",
    summary: "The remaining effort fits before the deadline.",
    remainingMinutes: 60,
    reservedMinutes: 0,
    scheduledMinutes: rejected ? 0 : 60,
    unscheduledMinutes: 0,
    alternatives: [
      {
        summary: "Start at the next free segment instead of the earliest one.",
        reason: "It loses the tie because it starts later.",
      },
    ],
    blocks: rejected ? [] : [block(today, mode === "plan-approved")],
    proposalId: "00000000-0000-4000-8000-000000000005",
    payloadHash: "preview-plan",
    idempotencyKey: "preview-plan",
    workItemId: "preview-plan",
    overrides,
  };
}

export function planFixtureItems(today: string): WorkspaceRecord[] {
  return [
    {
      id: "preview-plan",
      kind: "task",
      title: "Draft the notes",
      body: "",
      category: "work",
      version: 1,
      severity: "high",
      done: false,
      status: "open",
      date: today,
      surfaceSection: "today",
      surfaceReason: "Due today",
    },
  ];
}
