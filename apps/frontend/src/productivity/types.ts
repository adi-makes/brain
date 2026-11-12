export type Category = "personal" | "home" | "work" | "admin" | "learning";
export type Severity = "critical" | "high" | "medium" | "low";
export type RecordKind = "task" | "event" | "reminder" | "note";
export type EditScope = "one" | "following" | "all";

export type WorkspaceRecord = {
  id: string;
  kind: RecordKind;
  title: string;
  body: string;
  date?: string;
  endDate?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  severity?: Severity;
  done?: boolean;
  category: Category;
  version: number;
  location?: string;
  timezone?: string;
  seriesId?: string | null;
  occurrenceOn?: string | null;
  workItemId?: string | null;
  eventId?: string | null;
  remindAt?: string | null;
  remindOn?: string | null;
  offsetMinutes?: number | null;
  channel?: "in_app" | "email" | "push";
  status?: string;
};

export type WorkspaceBundle = {
  status: "ready" | "signed-out" | "error";
  message?: string;
  records: WorkspaceRecord[];
  timeZone: string;
};

export type MutationResult =
  { ok: true; record: WorkspaceRecord } | { ok: false; error: string; conflict?: boolean };
