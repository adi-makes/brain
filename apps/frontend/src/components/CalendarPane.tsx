"use client";

import { useEffect, useRef } from "react";
import { entriesOnDate, toCalendarEntries, type CalendarEntry } from "../calendar/adapter";
import {
  addDays,
  addMonths,
  formatDayNumber,
  formatLong,
  formatMonth,
  formatWeekday,
  isSameMonth,
  monthGrid,
  weekDays,
} from "../calendar/dates";
import { useWorkspace } from "../workspace/store";

const START_HOUR = 8;
const END_HOUR = 21;

function SeverityMark({ entry }: { entry: CalendarEntry }) {
  if (!entry.severity) return null;
  const shape =
    entry.severity === "critical"
      ? "rounded-[2px] bg-accent"
      : entry.severity === "high"
        ? "rounded-full bg-accent"
        : entry.severity === "medium"
          ? "rounded-full border border-accent"
          : "h-px w-2 bg-muted";
  return <span className={`inline-block h-2 w-2 shrink-0 ${shape}`} />;
}

function DayButton({
  date,
  selected,
  today,
  outside,
  onSelect,
}: {
  date: string;
  selected: boolean;
  today: boolean;
  outside?: boolean;
  onSelect: (date: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={today ? "date" : undefined}
      onClick={() => onSelect(date)}
      className={`cursor-pointer rounded-[10px] px-1 py-1 text-left ${
        selected ? "bg-accent-soft text-ink" : "hover:bg-canvas"
      } ${outside ? "text-muted" : "text-ink"}`}
    >
      <span className="block text-[11px] uppercase tracking-wide text-muted">
        {formatWeekday(date)}
      </span>
      <span className={`block text-sm tabular-nums ${today ? "underline decoration-accent" : ""}`}>
        {formatDayNumber(date)}
      </span>
    </button>
  );
}

function TimedBlock({ entry, hourHeight }: { entry: CalendarEntry; hourHeight: number }) {
  const start = entry.startMinutes ?? START_HOUR * 60;
  const end = entry.endMinutes ?? start + 45;
  const top = ((Math.max(start, START_HOUR * 60) - START_HOUR * 60) / 60) * hourHeight;
  const height = Math.max(((end - start) / 60) * hourHeight, 28);
  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-[8px] border border-line bg-surface px-1.5 py-1 text-left shadow-[var(--shadow)]"
      style={{ top, height }}
    >
      <p className="truncate text-xs font-medium text-ink">{entry.title}</p>
      <p className="text-[11px] tabular-nums text-muted">
        {String(Math.floor(start / 60)).padStart(2, "0")}:{String(start % 60).padStart(2, "0")}
      </p>
    </div>
  );
}

export function CalendarPane() {
  const { today, selectedDate, setSelectedDate, view, items, density, weekStartsOn } =
    useWorkspace();
  const entries = toCalendarEntries(items);
  const hourHeight = density === "compact" ? 40 : 52;
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = regionRef.current;
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target !== node) return;
      const move: Record<string, () => void> = {
        ArrowLeft: () => setSelectedDate(addDays(selectedDate, -1)),
        ArrowRight: () => setSelectedDate(addDays(selectedDate, 1)),
        ArrowUp: () => setSelectedDate(addDays(selectedDate, -7)),
        ArrowDown: () => setSelectedDate(addDays(selectedDate, 7)),
        PageUp: () => setSelectedDate(addMonths(selectedDate, -1)),
        PageDown: () => setSelectedDate(addMonths(selectedDate, 1)),
      };
      if (event.key === "Home") {
        event.preventDefault();
        setSelectedDate(today);
        return;
      }
      const action = move[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [selectedDate, setSelectedDate, today]);

  const selectedEntries = entriesOnDate(entries, selectedDate);

  return (
    <section
      aria-label="Calendar"
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface lg:overflow-hidden"
    >
      <div
        ref={regionRef}
        tabIndex={0}
        aria-label={`${view} calendar. Selected ${formatLong(selectedDate)}. Use arrow keys to move the date.`}
        className="max-h-[52dvh] min-h-0 flex-1 overflow-auto outline-none lg:max-h-none"
      >
        {view === "month" ? (
          <MonthGrid
            selectedDate={selectedDate}
            today={today}
            weekStartsOn={weekStartsOn}
            entries={entries}
            onSelect={setSelectedDate}
          />
        ) : view === "day" ? (
          <DayColumn
            date={selectedDate}
            isToday={selectedDate === today}
            entries={entriesOnDate(entries, selectedDate)}
            hourHeight={hourHeight}
          />
        ) : (
          <WeekGrid
            selectedDate={selectedDate}
            today={today}
            weekStartsOn={weekStartsOn}
            entries={entries}
            hourHeight={hourHeight}
            onSelect={setSelectedDate}
          />
        )}
      </div>
      <div className="border-t border-line px-4 py-3">
        <h2 className="text-sm font-medium text-ink">{formatLong(selectedDate)}</h2>
        {selectedEntries.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Nothing scheduled on this day in the fixtures.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {selectedEntries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 text-sm text-ink">
                <SeverityMark entry={entry} />
                <span className={entry.done ? "text-muted line-through" : ""}>{entry.title}</span>
                <span className="text-xs uppercase tracking-wide text-muted">{entry.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function WeekGrid({
  selectedDate,
  today,
  weekStartsOn,
  entries,
  hourHeight,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  weekStartsOn: 0 | 1;
  entries: CalendarEntry[];
  hourHeight: number;
  onSelect: (date: string) => void;
}) {
  const days = weekDays(selectedDate, weekStartsOn);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  return (
    <div className="min-w-0">
      <div className="lg:hidden">
        {days.map((date) => {
          const dayEntries = entriesOnDate(entries, date);
          return (
            <div key={date} className="border-b border-line px-3 py-3">
              <DayButton
                date={date}
                selected={date === selectedDate}
                today={date === today}
                onSelect={onSelect}
              />
              {dayEntries.length === 0 ? (
                <p className="mt-1 text-sm text-muted">Clear</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {dayEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 text-sm text-ink">
                      <SeverityMark entry={entry} />
                      <span className="min-w-0 flex-1">{entry.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {entry.allDay || entry.startMinutes === undefined
                          ? "All day"
                          : `${String(Math.floor(entry.startMinutes / 60)).padStart(2, "0")}:${String(entry.startMinutes % 60).padStart(2, "0")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <div className="hidden lg:block">
        <div className="sticky top-0 z-10 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line bg-surface">
          <div />
          {days.map((date) => (
            <DayButton
              key={date}
              date={date}
              selected={date === selectedDate}
              today={date === today}
              onSelect={onSelect}
            />
          ))}
        </div>
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line">
          <div />
          {days.map((date) => {
            const allDay = entriesOnDate(entries, date).filter((entry) => entry.allDay);
            return (
              <ul key={date} className="min-h-8 space-y-1 border-l border-line px-1 py-1">
                {allDay.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-1 truncate text-[11px] text-ink"
                  >
                    <SeverityMark entry={entry} />
                    <span className="truncate">{entry.title}</span>
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="pr-1 text-right text-[11px] tabular-nums text-muted"
                style={{ height: hourHeight }}
              >
                {String(hour).padStart(2, "0")}
              </div>
            ))}
          </div>
          {days.map((date) => {
            const dayEntries = entriesOnDate(entries, date);
            const timed = dayEntries.filter((entry) => !entry.allDay);
            return (
              <div key={date} className="relative border-l border-line">
                <div className="relative" style={{ height: hours.length * hourHeight }}>
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-t border-line"
                      style={{ height: hourHeight }}
                    />
                  ))}
                  {timed.map((entry) => (
                    <TimedBlock key={entry.id} entry={entry} hourHeight={hourHeight} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  date,
  isToday,
  entries,
  hourHeight,
}: {
  date: string;
  isToday: boolean;
  entries: CalendarEntry[];
  hourHeight: number;
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const timed = entries.filter((entry) => !entry.allDay);
  const allDay = entries.filter((entry) => entry.allDay);
  return (
    <div>
      <p className="px-4 py-3 text-sm text-ink">
        {formatLong(date)}
        {isToday ? (
          <span className="ml-2 text-xs uppercase tracking-wide text-muted">Today</span>
        ) : null}
      </p>
      {allDay.length > 0 ? (
        <ul className="border-y border-line px-4 py-2">
          {allDay.map((entry) => (
            <li key={entry.id} className="text-sm text-ink">
              {entry.title}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-[3rem_minmax(0,1fr)]">
        <div>
          {hours.map((hour) => (
            <div
              key={hour}
              className="pr-2 text-right text-[11px] tabular-nums text-muted"
              style={{ height: hourHeight }}
            >
              {String(hour).padStart(2, "0")}
            </div>
          ))}
        </div>
        <div
          className="relative border-l border-line"
          style={{ height: hours.length * hourHeight }}
        >
          {hours.map((hour) => (
            <div key={hour} className="border-t border-line" style={{ height: hourHeight }} />
          ))}
          {timed.map((entry) => (
            <TimedBlock key={entry.id} entry={entry} hourHeight={hourHeight} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  selectedDate,
  today,
  weekStartsOn,
  entries,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  weekStartsOn: 0 | 1;
  entries: CalendarEntry[];
  onSelect: (date: string) => void;
}) {
  const days = monthGrid(selectedDate, weekStartsOn);
  const labels = weekDays(selectedDate, weekStartsOn).map((date) => formatWeekday(date));
  return (
    <div className="p-3">
      <p className="px-1 pb-3 text-sm text-ink">{formatMonth(selectedDate)}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted">
        {labels.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const count = entriesOnDate(entries, date).length;
          return (
            <button
              key={date}
              type="button"
              aria-pressed={date === selectedDate}
              aria-current={date === today ? "date" : undefined}
              onClick={() => onSelect(date)}
              className={`cursor-pointer min-h-14 rounded-[10px] border px-1 py-1 text-left sm:min-h-20 ${
                date === selectedDate
                  ? "border-accent bg-accent-soft"
                  : "border-transparent hover:bg-canvas"
              }`}
            >
              <span
                className={`text-sm tabular-nums ${isSameMonth(date, selectedDate) ? "text-ink" : "text-muted"}`}
              >
                {formatDayNumber(date)}
              </span>
              {count > 0 ? (
                <span className="mt-1 block truncate text-[11px] text-muted">
                  {count} {count === 1 ? "item" : "items"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
