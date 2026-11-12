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
import { toISODate } from "../calendar/dates";
import { buildDemoItems } from "../demo/fixtures";
import type {
  CalendarView,
  DemoItem,
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
  items: DemoItem[];
  addItem: (item: DemoItem) => void;
  toggleTask: (id: string) => void;
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
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return isThemeChoice(stored) ? stored : "system";
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<CalendarView>("week");
  const [items, setItems] = useState<DemoItem[]>(() => buildDemoItems(today));
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("open");
  const [preview, setPreview] = useState<PreviewMode>("ready");
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [displayName, setDisplayNameState] = useState("A. Reader");
  const [weekStartsOn, setWeekStartsOnState] = useState<WeekStart>(1);
  const [density, setDensityState] = useState<Density>("comfortable");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [ready, setReady] = useState(false);

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

  const addItem = useCallback((item: DemoItem) => {
    setItems((current) => [item, ...current]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setPendingTaskId(id);
    window.setTimeout(() => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      );
      setPendingTaskId(null);
    }, 280);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  }, []);

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
      addItem,
      toggleTask,
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
    }),
    [
      today,
      selectedDate,
      view,
      items,
      addItem,
      toggleTask,
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
