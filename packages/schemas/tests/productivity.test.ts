import { describe, expect, it } from "vitest";
import { eventInputSchema, reminderInputSchema, workItemInputSchema } from "../src/productivity";

const key = "idem-test-01";

describe("productivity input", () => {
  it("rejects a work item with two deadlines", () => {
    const parsed = workItemInputSchema.safeParse({
      title: "Mend the hem",
      body: "",
      category: "home",
      severity: "low",
      dueOn: "2026-11-12",
      dueAt: "2026-11-12T15:00:00.000Z",
      estimateMinutes: null,
      idempotencyKey: key,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an event whose end is not after its start", () => {
    const parsed = eventInputSchema.safeParse({
      title: "Standup",
      body: "",
      category: "work",
      allDay: false,
      startsOn: "2026-03-08",
      endsOn: null,
      localStart: "09:30",
      localEnd: "09:00",
      timezone: "America/New_York",
      location: "",
      frequency: null,
      interval: null,
      untilOn: null,
      occurrenceCount: null,
      idempotencyKey: key,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an offset reminder without an event", () => {
    const parsed = reminderInputSchema.safeParse({
      title: "Ping",
      workItemId: null,
      eventId: null,
      remindAt: null,
      remindOn: null,
      offsetMinutes: 15,
      channel: "in_app",
      idempotencyKey: key,
    });
    expect(parsed.success).toBe(false);
  });
});
