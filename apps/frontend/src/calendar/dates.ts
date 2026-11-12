export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function startOfWeek(iso: string, weekStartsOn: 0 | 1): string {
  const date = parseISODate(iso);
  const day = date.getDay();
  const offset = (day - weekStartsOn + 7) % 7;
  return addDays(iso, -offset);
}

export function startOfMonth(iso: string): string {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return toISODate(date);
}

export function monthGrid(iso: string, weekStartsOn: 0 | 1): string[] {
  const first = startOfWeek(startOfMonth(iso), weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function weekDays(iso: string, weekStartsOn: 0 | 1): string[] {
  const start = startOfWeek(iso, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function isSameMonth(iso: string, monthIso: string): boolean {
  return iso.slice(0, 7) === monthIso.slice(0, 7);
}

export function formatLong(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseISODate(iso));
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(parseISODate(iso));
}

export function formatDayNumber(iso: string): string {
  return String(parseISODate(iso).getDate());
}

export function formatMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    parseISODate(iso),
  );
}

export function minutesFromTime(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
