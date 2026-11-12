import { minutesFromTime } from "./dates";
import type { CalendarEntry } from "./adapter";

export type PlanBlockView = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  reason: string;
  persisted: boolean;
};

export type PlanAlternative = {
  summary: string;
  reason: string;
};

export type PlanOverrides = {
  dailyLoadMinutes: number;
  preferredStart: string;
  preferredEnd: string;
};

export type PlanView = {
  fixture: boolean;
  status: "preview" | "approved" | "rejected";
  outcome: "feasible" | "insufficient_capacity" | "infeasible" | "overdue" | "already_planned";
  summary: string;
  remainingMinutes: number;
  reservedMinutes: number;
  scheduledMinutes: number;
  unscheduledMinutes: number;
  alternatives: PlanAlternative[];
  blocks: PlanBlockView[];
  proposalId: string;
  payloadHash: string;
  idempotencyKey: string;
  workItemId: string;
  overrides: PlanOverrides;
};

export function planCalendarEntries(blocks: readonly PlanBlockView[]): CalendarEntry[] {
  return blocks.map((block) => ({
    id: block.id,
    recordId: block.id,
    kind: block.persisted ? "plan" : "ghost",
    title: block.title,
    date: block.date,
    startMinutes: minutesFromTime(block.start),
    endMinutes: minutesFromTime(block.end),
    allDay: false,
    version: 1,
  }));
}
