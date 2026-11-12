"use server";

import {
  eventInputSchema,
  surfaceActionSchema,
  eventUpdateSchema,
  noteInputSchema,
  noteUpdateSchema,
  reminderInputSchema,
  reminderUpdateSchema,
  workItemInputSchema,
  workItemStatusSchema,
  workItemUpdateSchema,
} from "@second-brain/schemas";
import { headers } from "next/headers";
import type { Database } from "../lib/database.types";
import { createServerSupabase } from "../lib/supabase/server";
import { recordFromMutation } from "./map";
import type { MutationResult, SurfaceResult } from "./types";

type RpcName = keyof Database["public"]["Functions"];

async function sameOrigin(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function failed(error: { code?: string }): MutationResult {
  if (error.code === "P0002") {
    return {
      ok: false,
      conflict: true,
      error: "This changed somewhere else. Reload it, then try again.",
    };
  }
  if (error.code === "P0003") {
    return { ok: false, error: "That save was already sent with different details." };
  }
  if (error.code === "22023") return { ok: false, error: "Check the fields and try again." };
  if (error.code === "42501" || error.code === "P0004" || error.code === "23503") {
    return { ok: false, error: "That record is not available." };
  }
  return { ok: false, error: "The change was not saved." };
}

async function call(
  name: RpcName,
  args: Record<string, unknown>,
  timeZone: string,
): Promise<MutationResult> {
  if (!(await sameOrigin()))
    return { ok: false, error: "The request did not come from this site." };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Sign in to save." };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Sign in to save." };
  const { data, error } = await supabase.rpc(
    name,
    args as Database["public"]["Functions"][typeof name]["Args"],
  );
  if (error) return failed(error);
  const record = recordFromMutation(data, timeZone);
  if (!record) return { ok: false, error: "The change was not saved." };
  return { ok: true, record };
}

export async function createWorkItem(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = workItemInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "create_work_item",
    {
      p_title: value.title,
      p_body: value.body,
      p_category: value.category,
      p_severity: value.severity,
      p_due_on: value.dueOn,
      p_due_at: value.dueAt,
      p_estimate_minutes: value.estimateMinutes,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

export async function updateWorkItem(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = workItemUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "update_work_item",
    {
      p_id: value.id,
      p_expected_version: value.expectedVersion,
      p_title: value.title,
      p_body: value.body,
      p_category: value.category,
      p_severity: value.severity,
      p_due_on: value.dueOn,
      p_due_at: value.dueAt,
      p_estimate_minutes: value.estimateMinutes,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

export async function setWorkItemStatus(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = workItemStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return call(
    "set_work_item_status",
    {
      p_id: parsed.data.id,
      p_expected_version: parsed.data.expectedVersion,
      p_status: parsed.data.status,
      p_idempotency_key: parsed.data.idempotencyKey,
    },
    timeZone,
  );
}

export async function deleteWorkItem(
  id: string,
  expectedVersion: number,
  idempotencyKey: string,
  timeZone: string,
): Promise<MutationResult> {
  return call(
    "soft_delete_work_item",
    { p_id: id, p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey },
    timeZone,
  );
}

export async function createEvent(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "create_event",
    {
      p_title: value.title,
      p_body: value.body,
      p_category: value.category,
      p_all_day: value.allDay,
      p_starts_on: value.startsOn,
      p_ends_on: value.endsOn,
      p_local_start: value.localStart,
      p_local_end: value.localEnd,
      p_timezone: value.timezone,
      p_location: value.location,
      p_frequency: value.frequency,
      p_interval: value.interval,
      p_until: value.untilOn,
      p_count: value.occurrenceCount,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

export async function updateEvent(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "update_event",
    {
      p_id: value.id,
      p_expected_version: value.expectedVersion,
      p_scope: value.scope,
      p_title: value.title,
      p_body: value.body,
      p_category: value.category,
      p_all_day: value.allDay,
      p_starts_on: value.startsOn,
      p_ends_on: value.endsOn,
      p_local_start: value.localStart,
      p_local_end: value.localEnd,
      p_timezone: value.timezone,
      p_location: value.location,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

export async function deleteEvent(
  id: string,
  expectedVersion: number,
  scope: "one" | "following" | "all",
  idempotencyKey: string,
  timeZone: string,
): Promise<MutationResult> {
  return call(
    "soft_delete_event",
    {
      p_id: id,
      p_expected_version: expectedVersion,
      p_scope: scope,
      p_idempotency_key: idempotencyKey,
    },
    timeZone,
  );
}

export async function createNote(input: unknown): Promise<MutationResult> {
  const parsed = noteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "create_note",
    {
      p_title: value.title,
      p_body: value.body,
      p_work_item_id: value.workItemId,
      p_event_id: value.eventId,
      p_idempotency_key: value.idempotencyKey,
    },
    "UTC",
  );
}

export async function updateNote(input: unknown): Promise<MutationResult> {
  const parsed = noteUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return call(
    "update_note",
    {
      p_id: parsed.data.id,
      p_expected_version: parsed.data.expectedVersion,
      p_title: parsed.data.title,
      p_body: parsed.data.body,
      p_work_item_id: parsed.data.workItemId,
      p_event_id: parsed.data.eventId,
      p_idempotency_key: parsed.data.idempotencyKey,
    },
    "UTC",
  );
}

export async function deleteNote(
  id: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<MutationResult> {
  return call(
    "soft_delete_note",
    { p_id: id, p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey },
    "UTC",
  );
}

export async function createReminder(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = reminderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "create_reminder",
    {
      p_title: value.title,
      p_work_item_id: value.workItemId,
      p_event_id: value.eventId,
      p_remind_at: value.remindAt,
      p_remind_on: value.remindOn,
      p_offset_minutes: value.offsetMinutes,
      p_channel: value.channel,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

export async function updateReminder(input: unknown, timeZone: string): Promise<MutationResult> {
  const parsed = reminderUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const value = parsed.data;
  return call(
    "update_reminder",
    {
      p_id: value.id,
      p_expected_version: value.expectedVersion,
      p_title: value.title,
      p_work_item_id: value.workItemId,
      p_event_id: value.eventId,
      p_remind_at: value.remindAt,
      p_remind_on: value.remindOn,
      p_offset_minutes: value.offsetMinutes,
      p_channel: value.channel,
      p_status: value.status,
      p_idempotency_key: value.idempotencyKey,
    },
    timeZone,
  );
}

async function callSurface(name: RpcName, args: Record<string, unknown>): Promise<SurfaceResult> {
  if (!(await sameOrigin()))
    return { ok: false, error: "The request did not come from this site." };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Sign in to save." };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Sign in to save." };
  const { error } = await supabase.rpc(
    name,
    args as Database["public"]["Functions"][typeof name]["Args"],
  );
  if (error) {
    const result = failed(error);
    if (!result.ok) return { ok: false, error: result.error, conflict: result.conflict };
  }
  return { ok: true };
}

export async function dismissWorkSurface(input: unknown): Promise<SurfaceResult> {
  const parsed = surfaceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return callSurface("dismiss_work_surface", {
    p_id: parsed.data.id,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function restoreWorkSurface(input: unknown): Promise<SurfaceResult> {
  const parsed = surfaceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return callSurface("restore_work_surface", {
    p_id: parsed.data.id,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function pinWorkSurface(input: unknown): Promise<SurfaceResult> {
  const parsed = surfaceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return callSurface("pin_work_surface", {
    p_id: parsed.data.id,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function unpinWorkSurface(input: unknown): Promise<SurfaceResult> {
  const parsed = surfaceActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  return callSurface("unpin_work_surface", {
    p_id: parsed.data.id,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function deleteReminder(
  id: string,
  expectedVersion: number,
  idempotencyKey: string,
  timeZone: string,
): Promise<MutationResult> {
  return call(
    "soft_delete_reminder",
    { p_id: id, p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey },
    timeZone,
  );
}
