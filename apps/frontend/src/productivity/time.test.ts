import { describe, expect, it } from "vitest";
import { toCalendarEntries } from "../calendar/adapter";
import { zonedParts } from "./time";

describe("zoned wall time", () => {
  it("keeps 09:00 local across the March daylight-saving change", () => {
    expect(zonedParts("2026-03-07T14:00:00.000Z", "America/New_York")).toEqual({
      date: "2026-03-07",
      time: "09:00",
    });
    expect(zonedParts("2026-03-08T13:00:00.000Z", "America/New_York")).toEqual({
      date: "2026-03-08",
      time: "09:00",
    });
  });
});

describe("all-day calendar span", () => {
  it("places an all-day event on each local date and keeps one record id", () => {
    const entries = toCalendarEntries([
      {
        id: "span",
        kind: "event",
        title: "Away",
        date: "2026-11-12",
        endDate: "2026-11-13",
        allDay: true,
        version: 1,
      },
    ]);
    expect(entries.map((entry) => entry.date)).toEqual(["2026-11-12", "2026-11-13"]);
    expect(entries.every((entry) => entry.recordId === "span")).toBe(true);
  });
});
