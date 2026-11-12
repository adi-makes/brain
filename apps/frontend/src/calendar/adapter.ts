import { minutesFromTime } from "./dates";
import type { DemoItem, ItemKind, Severity } from "../demo/types";

export type CalendarEntry = {
  id: string;
  kind: Extract<ItemKind, "event" | "task">;
  title: string;
  date: string;
  startMinutes?: number;
  endMinutes?: number;
  allDay: boolean;
  severity?: Severity;
  done?: boolean;
};

export function toCalendarEntries(items: readonly DemoItem[]): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const item of items) {
    if ((item.kind !== "event" && item.kind !== "task") || !item.date) continue;
    const startMinutes = item.start ? minutesFromTime(item.start) : undefined;
    const endMinutes = item.end ? minutesFromTime(item.end) : undefined;
    const timed = item.kind === "event" && !item.allDay && startMinutes !== undefined;
    entries.push({
      id: item.id,
      kind: item.kind,
      title: item.title,
      date: item.date,
      startMinutes: timed ? startMinutes : undefined,
      endMinutes: timed ? endMinutes : undefined,
      allDay: !timed,
      severity: item.severity,
      done: item.done,
    });
  }
  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.startMinutes ?? -1) - (b.startMinutes ?? -1);
  });
}

export function entriesOnDate(entries: readonly CalendarEntry[], date: string): CalendarEntry[] {
  return entries.filter((entry) => entry.date === date);
}
