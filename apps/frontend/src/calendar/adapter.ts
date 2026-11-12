import { addDays, minutesFromTime } from "./dates";
import type { Severity } from "../demo/types";

export type CalendarSource = {
  id: string;
  kind: string;
  title: string;
  date?: string;
  endDate?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  severity?: Severity;
  done?: boolean;
  version?: number;
  seriesId?: string | null;
  timezone?: string;
};

export type CalendarEntry = {
  id: string;
  recordId: string;
  kind: "event" | "task" | "plan" | "ghost";
  title: string;
  date: string;
  startMinutes?: number;
  endMinutes?: number;
  allDay: boolean;
  severity?: Severity;
  done?: boolean;
  version: number;
  seriesId?: string | null;
  timezone?: string;
};

export function toCalendarEntries(items: readonly CalendarSource[]): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const item of items) {
    if ((item.kind !== "event" && item.kind !== "task") || !item.date) continue;
    const startMinutes = item.start ? minutesFromTime(item.start) : undefined;
    const endMinutes = item.end ? minutesFromTime(item.end) : undefined;
    const timed = item.kind === "event" && !item.allDay && startMinutes !== undefined;
    const endDate = item.endDate && item.endDate > item.date ? item.endDate : item.date;
    let day = item.date;
    let guard = 0;
    while (day <= endDate && guard < 60) {
      entries.push({
        id: day === item.date ? item.id : `${item.id}:${day}`,
        recordId: item.id,
        kind: item.kind === "event" ? "event" : "task",
        title: item.title,
        date: day,
        startMinutes: timed && day === item.date ? startMinutes : undefined,
        endMinutes: timed && day === item.date ? endMinutes : undefined,
        allDay: !timed || day !== item.date,
        severity: item.severity,
        done: item.done,
        version: item.version ?? 1,
        seriesId: item.seriesId,
        timezone: item.timezone,
      });
      if (!item.endDate || item.endDate <= item.date || timed) break;
      day = addDays(day, 1);
      guard += 1;
    }
  }
  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.startMinutes ?? -1) - (b.startMinutes ?? -1);
  });
}

export function entriesOnDate(entries: readonly CalendarEntry[], date: string): CalendarEntry[] {
  return entries.filter((entry) => entry.date === date);
}
