import { describe, expect, it } from "vitest";
import { entriesOnDate, toCalendarEntries } from "../calendar/adapter";
import { addDays, addMonths, monthGrid, startOfWeek, weekDays } from "../calendar/dates";
import { buildDemoItems } from "../demo/fixtures";
import type { DemoItem, QuickAddDraft } from "../demo/types";
import { filterTasks, searchItems, todayTasks, upcomingWork } from "./filters";
import { isThemeChoice, resolveTheme } from "./theme";
import { quickAddIsValid, validateQuickAdd } from "./validation";

const today = "2026-11-12";

const draft = (overrides: Partial<QuickAddDraft> = {}): QuickAddDraft => ({
  type: "task",
  title: "Mend the hem",
  date: today,
  start: "",
  end: "",
  severity: "low",
  body: "",
  ...overrides,
});

describe("dates", () => {
  it("starts a Monday week on Monday", () => {
    expect(startOfWeek("2026-11-12", 1)).toBe("2026-11-09");
    expect(weekDays("2026-11-12", 1)).toHaveLength(7);
    expect(weekDays("2026-11-12", 1)[0]).toBe("2026-11-09");
  });

  it("clamps month addition to the last valid day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("builds a six-week month grid", () => {
    expect(monthGrid("2026-11-12", 1)).toHaveLength(42);
  });
});

describe("calendar adapter", () => {
  const items: DemoItem[] = [
    {
      id: "note",
      kind: "note",
      title: "Margin",
      date: today,
    },
    {
      id: "event",
      kind: "event",
      title: "Studio review",
      date: today,
      start: "10:00",
      end: "11:30",
    },
    {
      id: "task",
      kind: "task",
      title: "Draft",
      date: addDays(today, 1),
      severity: "high",
    },
  ];

  it("maps dated events and tasks and drops notes", () => {
    const entries = toCalendarEntries(items);
    expect(entries.map((entry) => entry.id)).toEqual(["event", "task"]);
    expect(entries[0]?.allDay).toBe(false);
    expect(entries[0]?.startMinutes).toBe(600);
    expect(entries[1]?.allDay).toBe(true);
    expect(entriesOnDate(entries, today)).toHaveLength(1);
  });
});

describe("quick add", () => {
  it("requires a title and a date for events", () => {
    expect(validateQuickAdd(draft({ title: "  " })).title).toBe("Add a title.");
    expect(validateQuickAdd(draft({ type: "event", date: "" })).date).toBe("Add a date.");
    expect(validateQuickAdd(draft({ type: "event", start: "18:00", end: "18:00" })).end).toMatch(
      /after/,
    );
    expect(validateQuickAdd(draft({ type: "note", body: "" })).body).toBe("Add a note.");
    expect(quickAddIsValid(draft({ type: "note", body: "A line." }))).toBe(true);
  });
});

describe("filters", () => {
  const items = buildDemoItems(today);

  it("keeps open tasks and sorts upcoming work by date then severity", () => {
    expect(filterTasks(items, "open").every((item) => !item.done)).toBe(true);
    expect(filterTasks(items, "done").every((item) => item.done)).toBe(true);
    expect(todayTasks(items, today).map((item) => item.id)).toContain("task-note");
    const upcoming = upcomingWork(items, today);
    expect(upcoming.every((item) => item.date && item.date > today)).toBe(true);
    expect(upcoming.some((item) => item.done)).toBe(false);
  });

  it("searches fixtures and returns nothing for a blank query", () => {
    expect(searchItems(items, "   ")).toEqual([]);
    expect(searchItems(items, "studio").length).toBeGreaterThan(0);
    expect(searchItems(items, "no-such-fixture")).toEqual([]);
  });
});

describe("theme", () => {
  it("resolves system against the preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(isThemeChoice("dark")).toBe(true);
    expect(isThemeChoice("sepia")).toBe(false);
  });
});
