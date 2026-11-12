"use client";

import { useRef, useState } from "react";
import {
  deleteEvent,
  deleteNote,
  deleteReminder,
  deleteWorkItem,
  updateEvent,
  updateNote,
  updateReminder,
  updateWorkItem,
} from "../productivity/actions";
import type { EditScope, WorkspaceRecord } from "../productivity/types";
import { useWorkspace } from "../workspace/store";

export function RecordDialog() {
  const { editing, setEditing } = useWorkspace();
  if (!editing) return null;
  return (
    <RecordForm
      key={editing.id + ":" + editing.version}
      record={editing}
      onClose={() => setEditing(null)}
    />
  );
}

function RecordForm({ record, onClose }: { record: WorkspaceRecord; onClose: () => void }) {
  const { timeZone, applyRecord, removeRecord, reloadRecords, signedIn } = useWorkspace();
  const [title, setTitle] = useState(record.title);
  const [body, setBody] = useState(record.body);
  const [date, setDate] = useState(record.date ?? "");
  const [endDate, setEndDate] = useState(record.endDate ?? record.date ?? "");
  const [start, setStart] = useState(record.start ?? "");
  const [end, setEnd] = useState(record.end ?? "");
  const [location, setLocation] = useState(record.location ?? "");
  const [scope, setScope] = useState<EditScope>("one");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const key = useRef(crypto.randomUUID());

  const rotate = () => {
    key.current = crypto.randomUUID();
  };

  const save = () => {
    if (!signedIn) {
      setError("Sign in to save.");
      return;
    }
    setSaving(true);
    setError("");
    const idempotencyKey = key.current;
    const finish = (result: { ok: boolean; error?: string; record?: WorkspaceRecord }) => {
      setSaving(false);
      if (!result.ok || !result.record) {
        setError(result.error ?? "The change was not saved.");
        return;
      }
      key.current = crypto.randomUUID();
      if (record.kind === "task" || (record.kind === "event" && record.seriesId && scope !== "one")) {
        void reloadRecords();
      } else {
        applyRecord(result.record);
      }
      onClose();
    };
    if (record.kind === "task") {
      void updateWorkItem(
        {
          id: record.id,
          expectedVersion: record.version,
          title,
          body,
          category: record.category,
          severity: record.severity ?? "medium",
          dueOn: date || null,
          dueAt: null,
          estimateMinutes: null,
          idempotencyKey,
        },
        timeZone,
      ).then(finish);
      return;
    }
    if (record.kind === "event") {
      const allDay = !start || !end;
      void updateEvent(
        {
          id: record.id,
          expectedVersion: record.version,
          scope: record.seriesId ? scope : "one",
          title,
          body,
          category: record.category,
          allDay,
          startsOn: record.seriesId ? (record.occurrenceOn ?? date) : date,
          endsOn: allDay ? endDate || date : null,
          localStart: allDay ? null : start,
          localEnd: allDay ? null : end,
          timezone: record.timezone ?? timeZone,
          location,
          idempotencyKey,
        },
        timeZone,
      ).then(finish);
      return;
    }
    if (record.kind === "note") {
      void updateNote({
        id: record.id,
        expectedVersion: record.version,
        title,
        body,
        workItemId: record.workItemId ?? null,
        eventId: record.eventId ?? null,
        idempotencyKey,
      }).then(finish);
      return;
    }
    void updateReminder(
      {
        id: record.id,
        expectedVersion: record.version,
        title,
        workItemId: record.workItemId ?? null,
        eventId: record.eventId ?? null,
        remindAt:
          record.offsetMinutes == null && record.remindOn == null
            ? (record.remindAt ?? null)
            : null,
        remindOn: record.offsetMinutes == null && record.remindAt == null ? date || null : null,
        offsetMinutes: record.offsetMinutes ?? null,
        channel: record.channel ?? "in_app",
        status: record.status === "cancelled" ? "cancelled" : "active",
        idempotencyKey,
      },
      timeZone,
    ).then(finish);
  };

  const remove = () => {
    setSaving(true);
    const idempotencyKey = key.current;
    const done = (result: { ok: boolean; error?: string }) => {
      setSaving(false);
      if (!result.ok) {
        setError(result.error ?? "The change was not saved.");
        return;
      }
      if (record.kind === "event" && record.seriesId && scope !== "one") void reloadRecords();
      removeRecord(record.id);
      onClose();
    };
    if (record.kind === "task") {
      void deleteWorkItem(record.id, record.version, idempotencyKey, timeZone).then(done);
    } else if (record.kind === "event") {
      void deleteEvent(
        record.id,
        record.version,
        record.seriesId ? scope : "one",
        idempotencyKey,
        timeZone,
      ).then(done);
    } else if (record.kind === "note") {
      void deleteNote(record.id, record.version, idempotencyKey).then(done);
    } else {
      void deleteReminder(record.id, record.version, idempotencyKey, timeZone).then(done);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-title"
        className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-[12px] border border-line bg-surface p-5"
      >
        <h2 id="record-title" className="text-lg font-medium text-ink">
          Edit {record.kind}
        </h2>
        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <label className="mt-4 block text-sm text-ink" htmlFor="record-name">
          Title
          <input
            id="record-name"
            value={title}
            onChange={(event) => {
              rotate();
              setTitle(event.target.value);
            }}
            className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3 text-sm"
          />
        </label>
        {record.kind !== "reminder" ? (
          <label className="mt-4 block text-sm text-ink" htmlFor="record-body">
            {record.kind === "note" ? "Note" : "Details"}
            <textarea
              id="record-body"
              value={body}
              onChange={(event) => {
                rotate();
                setBody(event.target.value);
              }}
              className="mt-1 min-h-24 w-full rounded-[10px] border border-line bg-canvas px-3 py-2 text-sm"
            />
          </label>
        ) : null}
        {record.kind !== "note" ? (
          <label className="mt-4 block text-sm text-ink" htmlFor="record-date">
            Date
            <input
              id="record-date"
              type="date"
              value={date}
              disabled={Boolean(record.seriesId)}
              onChange={(event) => {
                rotate();
                setDate(event.target.value);
              }}
              className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3 text-sm disabled:opacity-60"
            />
          </label>
        ) : null}
        {record.seriesId ? (
          <p className="mt-1 text-xs text-muted">
            A repeating occurrence keeps its original date. Change the time, or choose how far the
            edit reaches.
          </p>
        ) : null}
        {record.kind === "event" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm text-ink">
              Start
              <input
                type="time"
                value={start}
                onChange={(event) => {
                  rotate();
                  setStart(event.target.value);
                }}
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
              />
            </label>
            <label className="text-sm text-ink">
              End
              <input
                type="time"
                value={end}
                onChange={(event) => {
                  rotate();
                  setEnd(event.target.value);
                }}
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
              />
            </label>
            <label className="col-span-2 text-sm text-ink">
              Location
              <input
                value={location}
                onChange={(event) => {
                  rotate();
                  setLocation(event.target.value);
                }}
                className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3"
              />
            </label>
          </div>
        ) : null}
        {record.kind === "event" && !start ? (
          <label className="mt-4 block text-sm text-ink" htmlFor="record-end-date">
            End date
            <input
              id="record-end-date"
              type="date"
              value={endDate}
              disabled={Boolean(record.seriesId)}
              onChange={(event) => {
                rotate();
                setEndDate(event.target.value);
              }}
              className="mt-1 min-h-11 w-full rounded-[10px] border border-line bg-canvas px-3 text-sm"
            />
          </label>
        ) : null}
        {record.seriesId ? (
          <fieldset className="mt-4">
            <legend className="text-sm text-ink">Apply to</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["one", "This occurrence"],
                  ["following", "This and following"],
                  ["all", "All in the series"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="min-h-11 cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="scope"
                    checked={scope === value}
                    onChange={() => setScope(value)}
                  />
                  <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3 text-sm peer-checked:border-accent peer-checked:bg-accent-soft">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-[10px] px-3 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={remove}
            className="min-h-11 rounded-[10px] border border-line px-3 text-sm"
          >
            Delete
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="min-h-11 rounded-[10px] bg-accent px-4 text-sm text-canvas disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
