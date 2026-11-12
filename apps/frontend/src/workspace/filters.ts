import type { Severity, TaskFilter } from "../demo/types";

type Listed = {
  id: string;
  kind: string;
  title: string;
  body?: string;
  date?: string;
  severity?: Severity;
  done?: boolean;
  reason?: string;
  location?: string;
};

export function filterTasks<T extends Listed>(items: readonly T[], filter: TaskFilter): T[] {
  return items.filter((item) => {
    if (item.kind !== "task") return false;
    if (filter === "open") return !item.done;
    if (filter === "done") return Boolean(item.done);
    if (filter === "all") return true;
    return item.severity === filter;
  });
}

export function tasksInSection<T extends Listed & { surfaceSection?: string }>(
  items: readonly T[],
  section: "today" | "upcoming",
): T[] {
  return items.filter((item) => item.kind === "task" && item.surfaceSection === section);
}

export function searchItems<T extends Listed>(items: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return items.filter((item) =>
    [item.title, item.body, item.reason, item.location, item.kind]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}
