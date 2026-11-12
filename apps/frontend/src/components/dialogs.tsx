"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatLong } from "../calendar/dates";
import type { ItemKind, QuickAddDraft } from "../demo/types";
import { searchItems } from "../workspace/filters";
import { useWorkspace } from "../workspace/store";
import { validateQuickAdd } from "../workspace/validation";
import { SearchSkeleton } from "./skeletons";

const TYPES: { id: ItemKind; label: string }[] = [
  { id: "task", label: "Task" },
  { id: "event", label: "Event" },
  { id: "reminder", label: "Reminder" },
  { id: "note", label: "Note" },
];

const EMPTY_DRAFT: QuickAddDraft = {
  type: "task",
  title: "",
  date: "",
  start: "",
  end: "",
  severity: "medium",
  body: "",
  repeat: "none",
};

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function useFocusTrap(active: boolean, node: HTMLElement | null) {
  useEffect(() => {
    if (!active || !node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = [
        ...node.querySelectorAll<HTMLElement>("button, [href], input, select, textarea"),
      ].filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [active, node]);
}

export function QuickAddDialog() {
  const { quickAddOpen, setQuickAddOpen } = useWorkspace();
  useEscape(quickAddOpen, () => setQuickAddOpen(false));
  if (!quickAddOpen) return null;
  return <QuickAddForm />;
}

function QuickAddForm() {
  const { setQuickAddOpen, saveQuickAdd, selectedDate, mutationsPaused, signedIn } = useWorkspace();
  const [draft, setDraft] = useState<QuickAddDraft>({ ...EMPTY_DRAFT, date: selectedDate });
  const [errors, setErrors] = useState<ReturnType<typeof validateQuickAdd>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);
  const titleId = useId();
  useFocusTrap(true, dialogNode);

  const submit = () => {
    const nextErrors = validateQuickAdd(draft);
    setErrors(nextErrors);
    setFormError("");
    const fieldFor = (id: string) => dialogNode?.querySelector<HTMLElement>(id) ?? null;
    const firstInvalid = nextErrors.type
      ? fieldFor("input[name='quick-add-type']")
      : nextErrors.title
        ? fieldFor("#quick-title")
        : nextErrors.date
          ? fieldFor("#quick-date")
          : nextErrors.end
            ? fieldFor("#quick-end")
            : nextErrors.body
              ? fieldFor("#quick-body")
              : null;
    if (firstInvalid || !draft.type) {
      firstInvalid?.focus();
      return;
    }
    if (!signedIn) {
      setFormError("Sign in to save.");
      return;
    }
    setSaving(true);
    void saveQuickAdd(draft, idempotencyKey).then((result) => {
      setSaving(false);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setIdempotencyKey(crypto.randomUUID());
      setQuickAddOpen(false);
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={setDialogNode}
        className="max-h-[85dvh] w-full max-w-lg overflow-auto overscroll-contain rounded-[12px] border border-line bg-surface p-5 shadow-[var(--shadow)]"
      >
        <h2 id={titleId} className="text-lg font-medium text-ink">
          Quick add
        </h2>
        <p className="mt-1 text-sm text-muted">
          {signedIn
            ? "This is saved to your account."
            : "Sign in to save. Nothing is stored in this tab."}
        </p>
        {formError ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        {mutationsPaused ? (
          <p className="mt-3 text-sm text-ink" role="status">
            Adding is paused while the offline or error preview is on.
          </p>
        ) : null}
        <fieldset className="mt-4" disabled={mutationsPaused}>
          <legend className="text-sm text-ink">Type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <label key={type.id} className="cursor-pointer min-h-11">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="quick-add-type"
                  checked={draft.type === type.id}
                  onChange={() => setDraft({ ...draft, type: type.id })}
                />
                <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3 text-sm peer-checked:border-accent peer-checked:bg-accent-soft">
                  {type.label}
                </span>
              </label>
            ))}
          </div>
          {errors.type ? <p className="mt-1 text-sm text-danger">{errors.type}</p> : null}
          <label className="mt-4 block text-sm text-ink" htmlFor="quick-title">
            Title
          </label>
          <input
            autoFocus
            id="quick-title"
            name="title"
            autoComplete="off"
            aria-invalid={errors.title ? true : undefined}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3 text-sm"
          />
          {errors.title ? (
            <p className="mt-1 text-sm text-danger" role="alert">
              {errors.title}
            </p>
          ) : null}
          {draft.type !== "note" ? (
            <>
              <label className="mt-4 block text-sm text-ink" htmlFor="quick-date">
                Date
              </label>
              <input
                id="quick-date"
                name="date"
                type="date"
                autoComplete="off"
                aria-invalid={errors.date ? true : undefined}
                value={draft.date}
                onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3 text-sm"
              />
              {errors.date ? <p className="mt-1 text-sm text-danger">{errors.date}</p> : null}
            </>
          ) : null}
          {draft.type === "event" ? (
            <label className="mt-4 block text-sm text-ink" htmlFor="quick-repeat">
              Repeat
              <select
                id="quick-repeat"
                value={draft.repeat}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    repeat: event.target.value as QuickAddDraft["repeat"],
                  })
                }
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily, eight times</option>
                <option value="weekly">Weekly, eight times</option>
              </select>
            </label>
          ) : null}
          {draft.type === "event" ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-ink">
                Start
                <input
                  name="start"
                  type="time"
                  autoComplete="off"
                  value={draft.start}
                  onChange={(event) => setDraft({ ...draft, start: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
                />
              </label>
              <label className="text-sm text-ink">
                End
                <input
                  id="quick-end"
                  name="end"
                  type="time"
                  autoComplete="off"
                  aria-invalid={errors.end ? true : undefined}
                  value={draft.end}
                  onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
                />
                {errors.end ? (
                  <span className="mt-1 block text-sm text-danger">{errors.end}</span>
                ) : null}
              </label>
            </div>
          ) : null}
          {draft.type === "task" ? (
            <label className="mt-4 block text-sm text-ink" htmlFor="quick-severity">
              Severity
              <select
                id="quick-severity"
                value={draft.severity}
                onChange={(event) =>
                  setDraft({ ...draft, severity: event.target.value as QuickAddDraft["severity"] })
                }
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          ) : null}
          {draft.type === "note" ? (
            <>
              <label className="mt-4 block text-sm text-ink" htmlFor="quick-body">
                Note
              </label>
              <textarea
                id="quick-body"
                name="body"
                autoComplete="off"
                aria-invalid={errors.body ? true : undefined}
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                className="mt-1 min-h-24 w-full rounded-[10px] border border-line bg-canvas px-3 py-2 text-sm"
              />
              {errors.body ? <p className="mt-1 text-sm text-danger">{errors.body}</p> : null}
            </>
          ) : null}
        </fieldset>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            className="cursor-pointer min-h-11 rounded-[10px] px-4 text-sm text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={mutationsPaused || saving}
            onClick={submit}
            className="cursor-pointer min-h-11 rounded-[10px] bg-accent px-4 text-sm text-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const { searchOpen, setSearchOpen } = useWorkspace();
  useEscape(searchOpen, () => setSearchOpen(false));
  if (!searchOpen) return null;
  return <CommandPaletteForm />;
}

function CommandPaletteForm() {
  const { setSearchOpen, items, setSelectedDate } = useWorkspace();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const titleId = useId();
  const searchTimer = useRef<number | null>(null);

  const updateQuery = (value: string) => {
    setQuery(value);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(() => setSearching(false), 180);
  };

  const results = searchItems(items, query);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-ink/30 p-4 pt-[12vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl overflow-auto overscroll-contain rounded-[12px] border border-line bg-surface shadow-[var(--shadow)]"
      >
        <h2 id={titleId} className="sr-only">
          Search
        </h2>
        <label className="sr-only" htmlFor="record-search">
          Search saved records
        </label>
        <input
          autoFocus
          id="record-search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search records…"
          name="query"
          autoComplete="off"
          className="min-h-12 w-full rounded-t-[12px] bg-transparent px-4 text-sm text-ink outline-none"
        />
        <div className="border-t border-line">
          {!query.trim() ? (
            <p className="px-4 py-3 text-sm text-muted">Type to search saved records.</p>
          ) : searching ? (
            <SearchSkeleton />
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted" role="status">
              No records match “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-80 overflow-auto py-2">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="cursor-pointer flex min-h-11 w-full items-center justify-between px-4 text-left text-sm hover:bg-canvas"
                    onClick={() => {
                      if (item.date) setSelectedDate(item.date);
                      setSearchOpen(false);
                    }}
                  >
                    <span className="text-ink">{item.title}</span>
                    <span className="text-xs uppercase tracking-wide text-muted">
                      {item.kind}
                      {formatResultDate(item) ? ` · ${formatResultDate(item)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssistantDock() {
  const { assistantOpen, setAssistantOpen } = useWorkspace();
  const titleId = useId();
  if (!assistantOpen) return null;

  return (
    <div className="fixed bottom-[4.5rem] right-3 z-30 w-[min(100%-1.5rem,20rem)] lg:bottom-4">
      {assistantOpen ? (
        <section
          aria-labelledby={titleId}
          className="rounded-[12px] border border-line bg-surface shadow-[var(--shadow)]"
        >
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 id={titleId} className="text-sm font-medium text-ink">
              Assistant
            </h2>
            <button
              type="button"
              className="cursor-pointer min-h-11 min-w-11 text-sm text-muted"
              onClick={() => setAssistantOpen(false)}
            >
              Close
            </button>
          </header>
          <div className="px-3 py-3">
            <p className="text-sm text-ink">
              The assistant is not available. Nothing is sent or saved.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function formatResultDate(item: { date?: string }): string {
  return item.date ? formatLong(item.date) : "";
}
