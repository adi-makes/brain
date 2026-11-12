"use server";

import { addDays, minutesFromTime } from "../calendar/dates";
import { createServerSupabase } from "../lib/supabase/server";
import type { PlanBlockView } from "../calendar/plan-display";
import { mapEvent, mapNote, mapReminder, mapWorkItem, rowsFrom } from "./map";
import type { WorkspaceBundle, WorkspaceRecord } from "./types";
import { zonedDate, zonedParts } from "./time";

export async function loadWorkspace(): Promise<WorkspaceBundle> {
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "signed-out", records: [], plans: [], timeZone: "UTC" };
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user.user)
    return { status: "signed-out", records: [], plans: [], timeZone: "UTC" };
  const profile = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.user.id)
    .maybeSingle();
  const timeZone = profile.data?.timezone || "UTC";
  const today = zonedDate(new Date(), timeZone);
  const [work, events, notes, reminders, plans] = await Promise.all([
    supabase.rpc("list_work_projections", {
      p_as_of: new Date().toISOString(),
    }),
    supabase.rpc("list_events_between", {
      p_start: addDays(today, -45),
      p_end: addDays(today, 120),
    }),
    supabase.rpc("list_notes", { p_limit: 100, p_query: "" }),
    supabase.rpc("list_reminders", { p_limit: 100 }),
    supabase
      .from("planning_blocks")
      .select("id, work_item_id, starts_at, ends_at, timezone, status")
      .eq("status", "active")
      .is("deleted_at", null),
  ]);
  if (
    work.error ||
    events.error ||
    notes.error ||
    reminders.error ||
    profile.error ||
    plans.error
  ) {
    return {
      status: "error",
      message: "The workspace could not be loaded.",
      records: [],
      plans: [],
      timeZone,
    };
  }
  const records: WorkspaceRecord[] = [
    ...rowsFrom(work.data).flatMap((item) => {
      const mapped = mapWorkItem(item, timeZone);
      return mapped ? [mapped] : [];
    }),
    ...rowsFrom(events.data).flatMap((item) => {
      const mapped = mapEvent(item, timeZone);
      return mapped ? [mapped] : [];
    }),
    ...rowsFrom(notes.data).flatMap((item) => {
      const mapped = mapNote(item);
      return mapped ? [mapped] : [];
    }),
    ...rowsFrom(reminders.data).flatMap((item) => {
      const mapped = mapReminder(item, timeZone);
      return mapped ? [mapped] : [];
    }),
  ];
  const titles = new Map(
    records.filter((item) => item.kind === "task").map((item) => [item.id, item.title]),
  );
  const saved: PlanBlockView[] = (plans.data ?? []).flatMap((row) => {
    const zone = row.timezone || timeZone;
    const start = zonedParts(row.starts_at, zone);
    const end = zonedParts(row.ends_at, zone);
    const startMinutes = minutesFromTime(start.time) ?? 0;
    const endMinutes = minutesFromTime(end.time) ?? startMinutes;
    return [
      {
        id: row.id,
        title: titles.get(row.work_item_id) ?? "Planned",
        date: start.date,
        start: start.time,
        end: end.time,
        minutes: end.date === start.date ? Math.max(0, endMinutes - startMinutes) : 0,
        reason: "Saved planned time. This is not completed work.",
        persisted: true,
      },
    ];
  });
  return { status: "ready", records, plans: saved, timeZone };
}
