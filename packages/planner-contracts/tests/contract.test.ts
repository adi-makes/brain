import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePlanProposal } from "../src/index";

const proposal = {
  proposal_id: "6f0d3c2e-7b1a-4e5d-9c44-2a8f0b6e1d30",
  payload_hash: "a".repeat(64),
  outcome: "feasible",
  summary: "The remaining effort fits before the deadline.",
  blocks: [
    {
      starts_at: "2026-11-12T09:00:00Z",
      ends_at: "2026-11-12T09:20:00Z",
      minutes: 20,
      timezone: "UTC",
      local_date: "2026-11-12",
      local_start: "09:00",
      local_end: "09:20",
      reason: "Earliest free time inside the preferred window.",
      in_preferred_window: true,
      daily_minutes_after: 20,
    },
  ],
  alternatives: [],
  remaining_minutes: 20,
  reserved_minutes: 0,
  scheduled_minutes: 20,
  unscheduled_minutes: 0,
  horizon_minutes: 900,
  safety_deadline: null,
  deadline: "2026-11-13T00:00:00Z",
  versions: {
    work_item: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", version: 1 },
    events: [],
    planning_blocks: [],
    effort_logs: [],
    preferences: 0,
  },
};

describe("planner contract", () => {
  it("accepts a proposal and does not change its times", () => {
    expect(parsePlanProposal(proposal).blocks[0]?.minutes).toBe(20);
  });

  it("rejects a proposal without a hash", () => {
    expect(() => parsePlanProposal({ ...proposal, payload_hash: "" })).toThrow();
  });

  it("does not contain a scheduling loop", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
    expect(source.includes("while (")).toBe(false);
    expect(source.includes("timedelta")).toBe(false);
  });
});
