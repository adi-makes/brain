export function zonedDate(value: Date, timeZone: string): string {
  return zonedParts(value.toISOString(), timeZone).date;
}

export function zonedParts(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${hour}:${read("minute")}`,
  };
}

export function timeFromMinutes(minutes: number): string {
  const bounded = Math.min(23 * 60 + 59, Math.max(0, minutes));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}
