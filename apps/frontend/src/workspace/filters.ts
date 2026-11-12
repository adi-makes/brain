import type { DemoItem, Severity, TaskFilter } from "../demo/types";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function filterTasks(items: readonly DemoItem[], filter: TaskFilter): DemoItem[] {
  return items.filter((item) => {
    if (item.kind !== "task") return false;
    if (filter === "open") return !item.done;
    if (filter === "done") return Boolean(item.done);
    if (filter === "all") return true;
    return item.severity === filter;
  });
}

export function upcomingWork(items: readonly DemoItem[], today: string): DemoItem[] {
  return items
    .filter((item) => item.kind === "task" && !item.done && item.date && item.date > today)
    .sort((a, b) => {
      const dateOrder = (a.date ?? "").localeCompare(b.date ?? "");
      if (dateOrder !== 0) return dateOrder;
      return SEVERITY_RANK[a.severity ?? "low"] - SEVERITY_RANK[b.severity ?? "low"];
    });
}

export function todayTasks(items: readonly DemoItem[], today: string): DemoItem[] {
  return items.filter((item) => item.kind === "task" && !item.done && item.date === today);
}

export function searchItems(items: readonly DemoItem[], query: string): DemoItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return items.filter((item) =>
    [item.title, item.body, item.reason, item.kind].join(" ").toLowerCase().includes(needle),
  );
}
