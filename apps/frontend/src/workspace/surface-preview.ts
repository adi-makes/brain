import type { WorkspaceRecord } from "../productivity/types";

function task(
  id: string,
  title: string,
  surface: Pick<
    WorkspaceRecord,
    "surfaceSection" | "surfaceReason" | "excludedReason" | "surfaceDismissed" | "surfacePinned"
  >,
  extra: Partial<WorkspaceRecord> = {},
): WorkspaceRecord {
  return {
    id,
    kind: "task",
    title,
    body: "",
    category: "home",
    version: 1,
    surfaceVersion: 1,
    severity: "medium",
    done: false,
    status: "open",
    ...surface,
    ...extra,
  };
}

export function overduePreview(): WorkspaceRecord[] {
  return [
    task(
      "preview-overdue",
      "Pay the invoice",
      { surfaceSection: "today", surfaceReason: "Overdue" },
      { severity: "high", date: "2026-11-11" },
    ),
  ];
}

export function densePreview(): WorkspaceRecord[] {
  return [
    task(
      "preview-today",
      "Call the school",
      { surfaceSection: "today", surfaceReason: "Due today" },
      { severity: "critical", date: "2026-11-12" },
    ),
    task(
      "preview-soon",
      "Renew the lease",
      { surfaceSection: "upcoming", surfaceReason: "Due soon" },
      { severity: "high", date: "2026-11-15" },
    ),
    task(
      "preview-pin",
      "Mend the hem",
      { surfaceSection: "today", surfaceReason: "Manually pinned", surfacePinned: true },
      { severity: "low" },
    ),
    task(
      "preview-dismissed",
      "File the receipt",
      { surfaceSection: "todo", excludedReason: "Dismissed", surfaceDismissed: true },
      { severity: "medium", date: "2026-11-12" },
    ),
    task(
      "preview-none",
      "Read the notes",
      { surfaceSection: "todo", excludedReason: "No due date" },
      { severity: "low" },
    ),
    task(
      "preview-done",
      "Send the draft",
      { surfaceSection: "todo", excludedReason: "Completed" },
      { severity: "medium", done: true, status: "done", date: "2026-11-10" },
    ),
  ];
}

export function previewBaseline(id: string): WorkspaceRecord | undefined {
  return [...overduePreview(), ...densePreview()].find((item) => item.id === id);
}
