"use server";

import { addDays } from "../calendar/dates";
import { createServerSupabase } from "../lib/supabase/server";
import { mapEvent, mapNote, mapReminder, mapWorkItem, rowsFrom } from "./map";
import type { WorkspaceBundle, WorkspaceRecord } from "./types";
import { zonedDate } from "./time";

export async function loadWorkspace(): Promise<WorkspaceBundle> {
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "signed-out", records: [], timeZone: "UTC" };
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user.user) return { status: "signed-out", records: [], timeZone: "UTC" };
  const profile = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.user.id)
    .maybeSingle();
  const timeZone = profile.data?.timezone || "UTC";
  const today = zonedDate(new Date(), timeZone);
  const [work, events, notes, reminders] = await Promise.all([
    supabase.rpc("list_work_items", {
      p_limit: 100,
      p_cursor_created: null as unknown as string,
      p_cursor_id: null as unknown as string,
      p_status: null as unknown as string,
    }),
    supabase.rpc("list_events_between", {
      p_start: addDays(today, -45),
      p_end: addDays(today, 120),
    }),
    supabase.rpc("list_notes", { p_limit: 100, p_query: "" }),
    supabase.rpc("list_reminders", { p_limit: 100 }),
  ]);
  if (work.error || events.error || notes.error || reminders.error || profile.error) {
    return {
      status: "error",
      message: "The workspace could not be loaded.",
      records: [],
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
  return { status: "ready", records, timeZone };
}
