"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zonedDate } from "../productivity/time";
import { loadWorkspace } from "../productivity/load";
import {
  createEvent,
  createNote,
  createReminder,
  createWorkItem,
  setWorkItemStatus,
  updateEvent,
} from "../productivity/actions";
import type { MutationResult, WorkspaceBundle, WorkspaceRecord } from "../productivity/types";
import { timeFromMinutes } from "../productivity/time";
import type {
  CalendarView,
  Density,
  PreviewMode,
  QuickAddDraft,
  TaskFilter,
  ThemeChoice,
  WeekStart,
} from "../demo/types";
import {
  DENSITY_KEY,
  NAME_KEY,
  THEME_KEY,
  WEEK_START_KEY,
  isThemeChoice,
  resolveTheme,
} from "./theme";

type WorkspaceContextValue = {
  today: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  items: WorkspaceRecord[];
  pendingTaskId: string | null;
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
  preview: PreviewMode;
  setPreview: (mode: PreviewMode) => void;
  refreshing: boolean;
  refresh: () => void;
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  weekStartsOn: WeekStart;
  setWeekStartsOn: (value: WeekStart) => void;
  density: Density;
  setDensity: (value: Density) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  mutationsPaused: boolean;
  preferencesReady: boolean;
  signedIn: boolean;
  timeZone: string;
  notice: string;
  clearNotice: () => void;
  editing: WorkspaceRecord | null;
  setEditing: (record: WorkspaceRecord | null) => void;
  toggleTask: (id: string) => void;
  saveQuickAdd: (draft: QuickAddDraft, idempotencyKey: string) => Promise<MutationResult>;
  moveEvent: (id: string, startMinutes: number) => void;
  applyRecord: (record: WorkspaceRecord) => void;
  removeRecord: (id: string) => void;
  reloadRecords: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return isThemeChoice(stored) ? stored : "system";
}

export function WorkspaceProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: WorkspaceBundle;
}) {
  const today = useMemo(() => zonedDate(new Date(), initial.timeZone), [initial.timeZone]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<CalendarView>("week");
  const [items, setItems] = useState<WorkspaceRecord[]>(initial.records);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [preview, setPreview] = useState<PreviewMode>("ready");
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [displayName, setDisplayNameState] = useState("Reader");
  const [weekStartsOn, setWeekStartsOnState] = useState<WeekStart>(1);
  const [density, setDensityState] = useState<Density>("comfortable");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState(initial.message ?? "");
  const [editing, setEditing] = useState<WorkspaceRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setThemeState(readStoredTheme());
      const name = window.localStorage.getItem(NAME_KEY);
      if (name) setDisplayNameState(name);
      const week = window.localStorage.getItem(WEEK_START_KEY);
      if (week === "0" || week === "1") setWeekStartsOnState(Number(week) as WeekStart);
      const storedDensity = window.localStorage.getItem(DENSITY_KEY);
      if (storedDensity === "comfortable" || storedDensity === "compact") {
        setDensityState(storedDensity);
      }
      setReady(true);
      document.documentElement.dataset.hydrated = "true";
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = resolveTheme(theme, media.matches) === "dark";
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [ready, theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    window.localStorage.setItem(THEME_KEY, next);
  }, []);
  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name);
    window.localStorage.setItem(NAME_KEY, name);
  }, []);
  const setWeekStartsOn = useCallback((value: WeekStart) => {
    setWeekStartsOnState(value);
    window.localStorage.setItem(WEEK_START_KEY, String(value));
  }, []);
  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    window.localStorage.setItem(DENSITY_KEY, value);
  }, []);

  const applyRecord = useCallback((record: WorkspaceRecord) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === record.id);
      if (!exists) return [record, ...current];
      return current.map((item) => (item.id === record.id ? record : item));
    });
  }, []);

  const removeRecord = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setEditing((current) => (current?.id === id ? null : current));
  }, []);

  const reloadRecords = useCallback(async () => {
    const bundle = await loadWorkspace();
    if (bundle.status === "error") {
      setNotice(bundle.message ?? "The workspace could not be loaded.");
      return;
    }
    setItems(bundle.records);
    setNotice("");
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void reloadRecords().finally(() => setRefreshing(false));
  }, [reloadRecords]);

  const toggleTask = useCallback(
    (id: string) => {
      if (initial.status !== "ready") {
        setNotice("Sign in to save.");
        return;
      }
      const current = items.find((item) => item.id === id && item.kind === "task");
      if (!current) return;
      const previous = items;
      const nextStatus = current.done ? "open" : "done";
      setPendingTaskId(id);
      setItems((rows) =>
        rows.map((item) => (item.id === id ? { ...item, done: nextStatus === "done" } : item)),
      );
      void setWorkItemStatus(
        {
          id,
          expectedVersion: current.version,
          status: nextStatus,
          idempotencyKey: crypto.randomUUID(),
        },
        initial.timeZone,
      ).then((result) => {
        if (!result.ok) {
          setItems(previous);
          setNotice(result.error);
        } else {
          applyRecord(result.record);
          setNotice("");
        }
        setPendingTaskId(null);
      });
    },
    [applyRecord, initial.status, initial.timeZone, items],
  );

  const saveQuickAdd = useCallback(
    async (draft: QuickAddDraft, idempotencyKey: string): Promise<MutationResult> => {
      if (initial.status !== "ready") return { ok: false, error: "Sign in to save." };
      const zone = initial.timeZone;
      let result: MutationResult;
      if (draft.type === "task") {
        result = await createWorkItem(
          {
            title: draft.title.trim(),
            body: draft.body.trim(),
            category: "personal",
            severity: draft.severity,
            dueOn: draft.date || null,
            dueAt: null,
            estimateMinutes: null,
            idempotencyKey,
          },
          zone,
        );
      } else if (draft.type === "event") {
        const timed = Boolean(draft.start && draft.end);
        result = await createEvent(
          {
            title: draft.title.trim(),
            body: draft.body.trim(),
            category: "personal",
            allDay: !timed,
            startsOn: draft.date,
            endsOn: timed ? null : draft.date,
            localStart: timed ? draft.start : null,
            localEnd: timed ? draft.end : null,
            timezone: zone,
            location: "",
            frequency: draft.repeat === "none" ? null : draft.repeat,
            interval: draft.repeat === "none" ? null : 1,
            untilOn: null,
            occurrenceCount: draft.repeat === "none" ? null : 8,
            idempotencyKey,
          },
          zone,
        );
      } else if (draft.type === "note") {
        result = await createNote({
          title: draft.title.trim(),
          body: draft.body.trim(),
          workItemId: null,
          eventId: null,
          idempotencyKey,
        });
      } else {
        result = await createReminder(
          {
            title: draft.title.trim(),
            workItemId: null,
            eventId: null,
            remindAt: null,
            remindOn: draft.date,
            offsetMinutes: null,
            channel: "in_app",
            idempotencyKey,
          },
          zone,
        );
      }
      if (!result.ok) {
        setNotice(result.error);
        return result;
      }
      if (draft.type === "event" && draft.repeat !== "none") await reloadRecords();
      else applyRecord(result.record);
      setNotice("");
      return result;
    },
    [applyRecord, initial.status, initial.timeZone, reloadRecords],
  );

  const moveEvent = useCallback(
    (id: string, startMinutes: number) => {
      const current = items.find((item) => item.id === id && item.kind === "event");
      if (
        !current ||
        !current.date ||
        !current.start ||
        !current.end ||
        initial.status !== "ready"
      ) {
        return;
      }
      const [startHour = 0, startMinute = 0] = current.start.split(":").map(Number);
      const [endHour = 0, endMinute = 0] = current.end.split(":").map(Number);
      const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
      if (duration < 1) return;
      const nextStart = timeFromMinutes(startMinutes);
      const nextEnd = timeFromMinutes(startMinutes + duration);
      if (nextEnd <= nextStart) {
        setNotice("The event has to stay inside the same day.");
        return;
      }
      const previous = items;
      setItems((rows) =>
        rows.map((item) => (item.id === id ? { ...item, start: nextStart, end: nextEnd } : item)),
      );
      void updateEvent(
        {
          id,
          expectedVersion: current.version,
          scope: "one",
          title: current.title,
          body: current.body,
          category: current.category,
          allDay: false,
          startsOn: current.occurrenceOn ?? current.date,
          endsOn: null,
          localStart: nextStart,
          localEnd: nextEnd,
          timezone: current.timezone ?? initial.timeZone,
          location: current.location ?? "",
          idempotencyKey: crypto.randomUUID(),
        },
        initial.timeZone,
      ).then((result) => {
        if (!result.ok) {
          setItems(previous);
          setNotice(result.error);
          return;
        }
        applyRecord(result.record);
      });
    },
    [applyRecord, initial.status, initial.timeZone, items],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing) return;
      if (event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      today,
      selectedDate,
      setSelectedDate,
      view,
      setView,
      items: preview === "empty" ? [] : items,
      pendingTaskId,
      filter,
      setFilter,
      preview,
      setPreview,
      refreshing,
      refresh,
      theme,
      setTheme,
      displayName,
      setDisplayName,
      weekStartsOn,
      setWeekStartsOn,
      density,
      setDensity,
      quickAddOpen,
      setQuickAddOpen,
      searchOpen,
      setSearchOpen,
      assistantOpen,
      setAssistantOpen,
      mutationsPaused: preview === "offline" || preview === "error",
      preferencesReady: ready,
      signedIn: initial.status === "ready",
      timeZone: initial.timeZone,
      notice,
      clearNotice: () => setNotice(""),
      editing,
      setEditing,
      toggleTask,
      saveQuickAdd,
      moveEvent,
      applyRecord,
      removeRecord,
      reloadRecords,
    }),
    [
      today,
      selectedDate,
      view,
      items,
      pendingTaskId,
      filter,
      preview,
      refreshing,
      refresh,
      theme,
      setTheme,
      displayName,
      setDisplayName,
      weekStartsOn,
      setWeekStartsOn,
      density,
      setDensity,
      quickAddOpen,
      searchOpen,
      assistantOpen,
      ready,
      initial.status,
      initial.timeZone,
      notice,
      editing,
      toggleTask,
      saveQuickAdd,
      moveEvent,
      applyRecord,
      removeRecord,
      reloadRecords,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

export type { QuickAddDraft };
