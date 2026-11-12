export type ItemKind = "task" | "event" | "reminder" | "note";

export type Severity = "critical" | "high" | "medium" | "low";

export type PreviewMode = "ready" | "loading" | "error" | "offline" | "empty";

export type CalendarView = "week" | "day" | "month";

export type ThemeChoice = "light" | "dark" | "system";

export type WeekStart = 0 | 1;

export type Density = "comfortable" | "compact";

export type TaskFilter = "open" | "done" | "all" | Severity;

export type DemoItem = {
  id: string;
  kind: ItemKind;
  title: string;
  date?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  severity?: Severity;
  done?: boolean;
  body?: string;
  reason?: string;
  sessionOnly?: boolean;
};

export type QuickAddDraft = {
  type: ItemKind | "";
  title: string;
  date: string;
  start: string;
  end: string;
  severity: Severity;
  body: string;
  repeat: "none" | "daily" | "weekly";
};

export const DEMO_NOTICE = "";
