import type { WorkspaceRecord } from "./types";
import { zonedParts } from "./time";

type Row = Record<string, unknown>;

function row(value: unknown): Row | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Row;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function versionOf(value: unknown): number {
  return typeof value === "number" ? value : 1;
}

export function rowsFrom(value: unknown): Row[] {
  const payload = row(value);
  const items = payload?.items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is Row => Boolean(row(item)));
}

export function mapWorkItem(value: unknown, timeZone: string): WorkspaceRecord | null {
  const item = row(value);
  if (!item || typeof item.id !== "string") return null;
  const dueOn = typeof item.due_on === "string" ? item.due_on : undefined;
  const dueAt = typeof item.due_at === "string" ? zonedParts(item.due_at, timeZone) : undefined;
  return {
    id: item.id,
    kind: "task",
    title: text(item.title),
    body: text(item.body),
    date: dueOn ?? dueAt?.date,
    start: dueOn ? undefined : dueAt?.time,
    allDay: dueAt === undefined,
    severity: item.severity as WorkspaceRecord["severity"],
    done: item.status === "done",
    category: (item.category as WorkspaceRecord["category"]) ?? "personal",
    version: versionOf(item.version),
    status: text(item.status),
    surfaceSection:
      item.surface_section === "today" ||
      item.surface_section === "upcoming" ||
      item.surface_section === "todo"
        ? item.surface_section
        : undefined,
    surfaceReason: typeof item.surface_reason === "string" ? item.surface_reason : undefined,
    excludedReason: typeof item.excluded_reason === "string" ? item.excluded_reason : undefined,
    surfaceDismissed: item.surface_dismissed === true,
    surfacePinned: item.surface_pinned === true,
    surfaceVersion: typeof item.surface_version === "number" ? item.surface_version : undefined,
  };
}

export function mapEvent(value: unknown, timeZone: string): WorkspaceRecord | null {
  const item = row(value);
  if (!item || typeof item.id !== "string") return null;
  const zone = text(item.timezone) || timeZone;
  const start = typeof item.starts_at === "string" ? zonedParts(item.starts_at, zone) : undefined;
  const end = typeof item.ends_at === "string" ? zonedParts(item.ends_at, zone) : undefined;
  const allDay = item.all_day === true;
  return {
    id: item.id,
    kind: "event",
    title: text(item.title),
    body: text(item.body),
    date: allDay ? text(item.starts_on) : start?.date,
    endDate: allDay ? text(item.ends_on) : end?.date,
    start: allDay ? undefined : start?.time,
    end: allDay ? undefined : end?.time,
    allDay,
    category: (item.category as WorkspaceRecord["category"]) ?? "personal",
    version: versionOf(item.version),
    location: text(item.location),
    timezone: zone,
    seriesId: typeof item.series_id === "string" ? item.series_id : null,
    occurrenceOn: typeof item.occurrence_on === "string" ? item.occurrence_on : null,
  };
}

export function mapNote(value: unknown): WorkspaceRecord | null {
  const item = row(value);
  if (!item || typeof item.id !== "string") return null;
  return {
    id: item.id,
    kind: "note",
    title: text(item.title),
    body: text(item.body),
    category: "personal",
    version: versionOf(item.version),
    workItemId: typeof item.work_item_id === "string" ? item.work_item_id : null,
    eventId: typeof item.event_id === "string" ? item.event_id : null,
  };
}

export function mapReminder(value: unknown, timeZone: string): WorkspaceRecord | null {
  const item = row(value);
  if (!item || typeof item.id !== "string") return null;
  const at = typeof item.remind_at === "string" ? zonedParts(item.remind_at, timeZone) : undefined;
  return {
    id: item.id,
    kind: "reminder",
    title: text(item.title),
    body: "",
    date: typeof item.remind_on === "string" ? item.remind_on : at?.date,
    start: at?.time,
    category: "personal",
    version: versionOf(item.version),
    workItemId: typeof item.work_item_id === "string" ? item.work_item_id : null,
    eventId: typeof item.event_id === "string" ? item.event_id : null,
    remindAt: typeof item.remind_at === "string" ? item.remind_at : null,
    remindOn: typeof item.remind_on === "string" ? item.remind_on : null,
    offsetMinutes: typeof item.offset_minutes === "number" ? item.offset_minutes : null,
    channel: item.channel as WorkspaceRecord["channel"],
    status: text(item.status),
  };
}

export function recordFromMutation(value: unknown, timeZone: string): WorkspaceRecord | null {
  const payload = row(value);
  if (!payload) return null;
  if ("work_item" in payload) return mapWorkItem(payload.work_item, timeZone);
  if ("event" in payload) return mapEvent(payload.event, timeZone);
  if ("note" in payload) return mapNote(payload.note);
  if ("reminder" in payload) return mapReminder(payload.reminder, timeZone);
  return null;
}
