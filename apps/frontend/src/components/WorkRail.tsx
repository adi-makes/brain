"use client";

import type { ReactNode } from "react";
import { formatLong } from "../calendar/dates";
import type { DemoItem, Severity, TaskFilter } from "../demo/types";
import { filterTasks, todayTasks, upcomingWork } from "../workspace/filters";
import { useWorkspace } from "../workspace/store";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

function Mark({ severity }: { severity?: Severity }) {
  if (!severity) return null;
  const label = severity[0]?.toUpperCase() + severity.slice(1);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted">
      <span
        className={`inline-block h-2 w-2 ${
          severity === "critical"
            ? "rounded-[2px] bg-accent"
            : severity === "high"
              ? "rounded-full bg-accent"
              : severity === "medium"
                ? "rounded-full border border-accent"
                : "h-px w-2 bg-muted"
        }`}
      />
      {label}
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="border-b border-line px-4 py-4">
      <h2
        id={`${id}-heading`}
        className="text-pretty text-[11px] uppercase tracking-[0.14em] text-muted"
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-sm text-muted">{children}</p>;
}

export function WorkRail() {
  const { today, items, filter, setFilter, toggleTask, pendingTaskId, mutationsPaused } =
    useWorkspace();
  const todayList = todayTasks(items, today);
  const upcoming = upcomingWork(items, today);
  const todos = filterTasks(items, filter);
  const reminders = items.filter((item) => item.kind === "reminder");

  return (
    <aside className="bg-surface lg:min-h-0 lg:w-[22rem] lg:shrink-0 lg:overflow-auto">
      <Section id="today" title="Today">
        {todayList.length === 0 ? (
          <EmptyLine>Nothing due today in these fixtures.</EmptyLine>
        ) : (
          <ItemList items={todayList} />
        )}
      </Section>
      <Section id="upcoming" title="Upcoming work">
        {upcoming.length === 0 ? (
          <EmptyLine>No open work with a future due date.</EmptyLine>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((item) => (
              <li key={item.id}>
                <p className="text-sm text-ink">{item.title}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{item.date ? formatLong(item.date) : "No date"}</span>
                  <Mark severity={item.severity} />
                </p>
                {item.reason ? <p className="mt-1 text-xs text-muted">{item.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section id="todo" title="To-do">
        <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="To-do filters">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={`cursor-pointer min-h-11 rounded-[10px] px-3 text-xs ${
                filter === option.id ? "bg-accent text-canvas" : "text-muted hover:bg-canvas"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {todos.length === 0 ? (
          <EmptyLine>No to-do items match this filter.</EmptyLine>
        ) : (
          <ul className="space-y-2">
            {todos.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <button
                  type="button"
                  aria-pressed={Boolean(item.done)}
                  disabled={mutationsPaused || pendingTaskId === item.id}
                  onClick={() => toggleTask(item.id)}
                  className="cursor-pointer mt-0.5 min-h-11 rounded-[10px] border border-line px-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingTaskId === item.id ? "Saving…" : item.done ? "Mark open" : "Mark done"}
                </button>
                <div>
                  <p className={`text-sm ${item.done ? "text-muted line-through" : "text-ink"}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted">
                    {item.reason ?? "Local fixture"}
                    {pendingTaskId === item.id ? " · Updating in this tab" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section id="reminders" title="Reminders">
        {reminders.length === 0 ? (
          <EmptyLine>No reminder definitions in these fixtures.</EmptyLine>
        ) : (
          <ul className="space-y-3">
            {reminders.map((item) => (
              <li key={item.id}>
                <p className="text-sm text-ink">{item.title}</p>
                <p className="text-xs text-muted">
                  {item.date ? formatLong(item.date) : "Unscheduled"}
                  {item.start ? ` · ${item.start}` : ""}
                </p>
                {item.reason ? <p className="text-xs text-muted">{item.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}

function ItemList({ items }: { items: DemoItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="text-sm text-ink">
          {item.title}
          {item.reason ? (
            <span className="mt-1 block text-xs text-muted">{item.reason}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
