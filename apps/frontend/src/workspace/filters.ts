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

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
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

export function upcomingWork<T extends Listed>(items: readonly T[], today: string): T[] {
  return items
    .filter((item) => item.kind === "task" && !item.done && item.date && item.date > today)
    .sort((a, b) => {
      const dateOrder = (a.date ?? "").localeCompare(b.date ?? "");
      if (dateOrder !== 0) return dateOrder;
      return SEVERITY_RANK[a.severity ?? "low"] - SEVERITY_RANK[b.severity ?? "low"];
    });
}

export function todayTasks<T extends Listed>(items: readonly T[], today: string): T[] {
  return items.filter((item) => item.kind === "task" && !item.done && item.date === today);
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
