"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { addDays, addMonths, formatLong, formatMonth } from "../calendar/dates";
import { accountLabel } from "../auth/account";
import type { AuthView } from "../auth/view";
import type { CalendarView, PreviewMode } from "../demo/types";
import { RecordDialog } from "./RecordDialog";
import { useWorkspace } from "../workspace/store";
import { CalendarPane } from "./CalendarPane";
import { AssistantDock, CommandPalette, QuickAddDialog } from "./dialogs";
import { IconChevron, IconPlus, IconSearch } from "./icons";
import { DashboardSkeleton } from "./skeletons";
import { WorkRail } from "./WorkRail";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const PREVIEWS: { id: PreviewMode; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
  { id: "offline", label: "Offline preview" },
  { id: "empty", label: "Empty" },
  { id: "dense", label: "Dense preview" },
  { id: "overdue", label: "Overdue preview" },
];

export function WorkspaceShell({ children, auth }: { children: ReactNode; auth: AuthView }) {
  const pathname = usePathname();
  const {
    today,
    selectedDate,
    setSelectedDate,
    view,
    setView,
    preview,
    setPreview,
    refreshing,
    refresh,
    displayName,
    notice,
    setSearchOpen,
    setQuickAddOpen,
    setAssistantOpen,
  } = useWorkspace();

  const shift = (direction: -1 | 1) => {
    if (view === "month") setSelectedDate(addMonths(selectedDate, direction));
    else if (view === "week") setSelectedDate(addDays(selectedDate, direction * 7));
    else setSelectedDate(addDays(selectedDate, direction));
  };

  const rangeLabel = view === "month" ? formatMonth(selectedDate) : formatLong(selectedDate);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to workspace
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Second Brain</p>
            <p className="truncate text-sm text-ink">{displayName}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-label="Search records"
              className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm text-ink hover:bg-canvas"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch />
              <span className="hidden sm:inline">Search</span>
            </button>
            <Link
              href={auth.status === "ready" ? "/account" : "/sign-in"}
              className="inline-flex min-h-11 max-w-40 items-center truncate rounded-[10px] px-3 text-sm text-ink hover:bg-canvas"
            >
              {auth.status === "ready"
                ? accountLabel(auth.account)
                : auth.status === "error"
                  ? "Account"
                  : "Sign in"}
            </Link>
            <Link
              href="/"
              className="hidden min-h-11 items-center rounded-[10px] px-3 text-sm text-ink hover:bg-canvas lg:inline-flex"
            >
              Workspace
            </Link>
            <Link
              href="/settings"
              className="hidden min-h-11 items-center rounded-[10px] px-3 text-sm text-ink hover:bg-canvas lg:inline-flex"
            >
              Settings
            </Link>
            <button
              type="button"
              className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-accent px-3 text-sm text-canvas"
              onClick={() => setQuickAddOpen(true)}
            >
              <IconPlus />
              Add
            </button>
          </div>
        </div>
        {pathname === "/" ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
            <button
              type="button"
              aria-label="Previous range"
              className="cursor-pointer inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] hover:bg-canvas"
              onClick={() => shift(-1)}
            >
              <IconChevron direction="left" />
            </button>
            <button
              type="button"
              className="cursor-pointer min-h-11 rounded-[10px] px-2 text-sm text-ink hover:bg-canvas"
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next range"
              className="cursor-pointer inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] hover:bg-canvas"
              onClick={() => shift(1)}
            >
              <IconChevron direction="right" />
            </button>
            <p className="whitespace-nowrap text-sm text-ink">{rangeLabel}</p>
            <div
              role="radiogroup"
              aria-label="Calendar view"
              className="flex rounded-[10px] border border-line"
            >
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={view === option.id}
                  onClick={() => setView(option.id)}
                  className={`cursor-pointer min-h-11 px-3 text-sm ${
                    view === option.id ? "bg-accent-soft text-ink" : "text-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="preview-mode">
              Workspace state
            </label>
            <select
              id="preview-mode"
              value={preview}
              onChange={(event) => setPreview(event.target.value as PreviewMode)}
              className="min-h-11 rounded-[10px] border border-line bg-canvas px-2 text-sm"
            >
              {PREVIEWS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refresh}
              className="cursor-pointer min-h-11 rounded-[10px] px-3 text-sm text-muted hover:bg-canvas"
            >
              {refreshing ? "Updating…" : "Refresh"}
            </button>
            <button
              type="button"
              className="cursor-pointer min-h-11 rounded-[10px] px-3 text-sm text-muted hover:bg-canvas"
              onClick={() => setAssistantOpen(true)}
            >
              Assistant
            </button>
          </div>
        ) : null}
      </header>
      {notice ? (
        <p role="alert" className="border-b border-line px-3 py-2 text-sm text-ink">
          {notice}
        </p>
      ) : null}
      <AuthStatus auth={auth} />
      <PreviewNote />
      <div
        id="workspace"
        className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row lg:overflow-hidden"
      >
        {pathname === "/" ? <WorkspaceBody /> : children}
      </div>
      <nav
        aria-label="Workspace"
        className="sticky bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <MobileLink href="/#today" label="Today" />
        <MobileLink href="/" label="Calendar" />
        <MobileLink href="/#reminders" label="Reminders" />
        <MobileLink href="/settings" label="Settings" />
      </nav>
      <QuickAddDialog />
      <RecordDialog />
      <CommandPalette />
      <AssistantDock />
    </div>
  );
}

function AuthStatus({ auth }: { auth: AuthView }) {
  if (auth.status === "unconfigured") {
    return (
      <p className="border-b border-line px-3 py-2 text-xs text-muted">
        Sign-in is off until Supabase is configured. The lists stay empty until then.
      </p>
    );
  }
  if (auth.status === "error") {
    return (
      <p role="alert" className="border-b border-line px-3 py-2 text-xs text-ink">
        {auth.message}
      </p>
    );
  }
  if (auth.status === "ready" && !auth.account.verified) {
    return (
      <p className="border-b border-line px-3 py-2 text-xs text-muted">
        Email is not confirmed. The workspace is still available.
      </p>
    );
  }
  return null;
}

function PreviewNote() {
  const { preview } = useWorkspace();
  if (preview === "error") {
    return (
      <p role="alert" className="border-b border-line bg-accent-soft px-3 py-2 text-sm text-ink">
        This is a preview of the error state. Saving is paused. It is not a network error.
      </p>
    );
  }
  if (preview === "offline") {
    return (
      <p role="status" className="border-b border-line bg-accent-soft px-3 py-2 text-sm text-ink">
        Offline preview. The browser is still online. Changes are paused so this state does not look
        saved.
      </p>
    );
  }
  if (preview === "dense" || preview === "overdue") {
    return (
      <p role="status" className="border-b border-line bg-accent-soft px-3 py-2 text-sm text-ink">
        Preview. Nothing is saved.
      </p>
    );
  }
  return null;
}

function WorkspaceBody() {
  const { preview } = useWorkspace();
  if (preview === "loading") return <DashboardSkeleton />;
  return (
    <>
      <div className="relative flex min-h-[22rem] min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
        <CalendarPane />
      </div>
      <WorkRail />
    </>
  );
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex min-h-11 flex-1 items-center justify-center text-sm text-ink">
      {label}
    </Link>
  );
}
