"use server";

import {
  parsePlanProposal,
  planApplyInputSchema,
  planPreviewInputSchema,
  type PlanApplyInput,
  type PlanPreviewInput,
  type PlanProposal,
} from "@second-brain/planner-contracts";
import { headers } from "next/headers";
import type { PlanView } from "../calendar/plan-display";
import { createServerSupabase } from "../lib/supabase/server";

export type PlanActionResult =
  { ok: true; plan: PlanView } | { ok: false; error: string; conflict?: boolean };

const defaults = {
  version: 0,
  working_days: [0, 1, 2, 3, 4],
  work_start: "09:00:00",
  work_end: "17:00:00",
  break_start: "12:00:00",
  break_minutes: 30,
  preferred_start: "09:00:00",
  preferred_end: "12:00:00",
  daily_load_minutes: 240,
  safety_lead_days: 1,
  protected: [] as unknown[],
};

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

function savedId(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("id" in value)) return null;
  const id = value.id;
  return typeof id === "string" ? id : null;
}

function viewFromProposal(
  proposal: PlanProposal,
  input: PlanPreviewInput | PlanApplyInput,
  title: string,
  status: PlanView["status"],
  idempotencyKey: string,
): PlanView {
  return {
    fixture: false,
    status,
    outcome: proposal.outcome,
    summary: proposal.summary,
    remainingMinutes: proposal.remaining_minutes,
    reservedMinutes: proposal.reserved_minutes,
    scheduledMinutes: proposal.scheduled_minutes,
    unscheduledMinutes: proposal.unscheduled_minutes,
    alternatives: proposal.alternatives.map((item) => ({
      summary: item.summary,
      reason: item.reason,
    })),
    blocks: proposal.blocks.map((block) => ({
      id: `${proposal.proposal_id}:${block.starts_at}`,
      title,
      date: block.local_date,
      start: block.local_start,
      end: block.local_end,
      minutes: block.minutes,
      reason: block.reason,
      persisted: status === "approved",
    })),
    proposalId: proposal.proposal_id,
    payloadHash: proposal.payload_hash,
    idempotencyKey,
    workItemId: input.workItemId,
    overrides: {
      dailyLoadMinutes: input.dailyLoadMinutes ?? defaults.daily_load_minutes,
      preferredStart: input.preferredStart ?? "09:00",
      preferredEnd: input.preferredEnd ?? "12:00",
    },
  };
}

async function plannerPost(
  path: string,
  body: unknown,
): Promise<{ ok: true; body: unknown } | { ok: false; conflict?: boolean; error: string }> {
  const base = process.env.PLANNER_API_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(new URL(path, base.endsWith("/") ? base : `${base}/`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.status === 409) {
      return {
        ok: false,
        conflict: true,
        error: "This proposal is stale. Generate it again.",
      };
    }
    if (!response.ok)
      return { ok: false, error: "The planner is unavailable. Nothing was scheduled." };
    return { ok: true, body: payload };
  } catch {
    return { ok: false, error: "The planner is unavailable. Nothing was scheduled." };
  }
}

async function snapshot(input: PlanPreviewInput) {
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false as const, error: "Sign in to plan. Nothing was scheduled." };
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false as const, error: "Sign in to plan. Nothing was scheduled." };
  const [profile, item, events, blocks, logs, preferences] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.user.id).maybeSingle(),
    supabase
      .from("work_items")
      .select("id, title, status, severity, estimate_minutes, due_on, due_at, version")
      .eq("id", input.workItemId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, version, starts_at, ends_at, all_day, starts_on, ends_on")
      .is("deleted_at", null),
    supabase
      .from("planning_blocks")
      .select("id, work_item_id, starts_at, ends_at, status, version")
      .is("deleted_at", null),
    supabase
      .from("task_effort_logs")
      .select("id, minutes, version")
      .eq("work_item_id", input.workItemId),
    supabase.from("planning_preferences").select("*").maybeSingle(),
  ]);
  if (!item.data) return { ok: false as const, error: "That record is not available." };
  if (
    profile.error ||
    item.error ||
    events.error ||
    blocks.error ||
    logs.error ||
    preferences.error
  ) {
    return { ok: false as const, error: "The planner is unavailable. Nothing was scheduled." };
  }
  const preference = preferences.data;
  const preferredStart = input.preferredStart ? `${input.preferredStart}:00` : null;
  const preferredEnd = input.preferredEnd ? `${input.preferredEnd}:00` : null;
  if (preferredStart && preferredEnd && preferredEnd <= preferredStart) {
    return { ok: false as const, error: "Check the preferred window and try again." };
  }
  const body = {
    as_of: new Date().toISOString(),
    timezone: profile.data?.timezone || "UTC",
    work_item: {
      id: item.data.id,
      title: item.data.title,
      status: item.data.status,
      severity: item.data.severity,
      estimate_minutes: item.data.estimate_minutes,
      due_on: item.data.due_on,
      due_at: item.data.due_at,
      version: item.data.version,
    },
    effort_logs: (logs.data ?? []).map((row) => ({
      id: row.id,
      minutes: row.minutes,
      version: row.version,
    })),
    events: (events.data ?? []).map((row) => ({
      id: row.id,
      version: row.version,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      all_day: row.all_day,
      starts_on: row.starts_on,
      ends_on: row.ends_on,
    })),
    planning_blocks: (blocks.data ?? []).map((row) => ({
      id: row.id,
      work_item_id: row.work_item_id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
      version: row.version,
    })),
    preferences: {
      version: preference?.version ?? defaults.version,
      working_days: preference?.working_days ?? defaults.working_days,
      work_start: preference?.work_start ?? defaults.work_start,
      work_end: preference?.work_end ?? defaults.work_end,
      break_start: preference?.break_start ?? defaults.break_start,
      break_minutes: preference?.break_minutes ?? defaults.break_minutes,
      preferred_start: preferredStart ?? preference?.preferred_start ?? defaults.preferred_start,
      preferred_end: preferredEnd ?? preference?.preferred_end ?? defaults.preferred_end,
      daily_load_minutes:
        input.dailyLoadMinutes ?? preference?.daily_load_minutes ?? defaults.daily_load_minutes,
      safety_lead_days: preference?.safety_lead_days ?? defaults.safety_lead_days,
      protected: Array.isArray(preference?.protected) ? preference.protected : defaults.protected,
    },
  };
  return { ok: true as const, body, title: item.data.title, timezone: body.timezone };
}

export async function previewPlan(input: unknown): Promise<PlanActionResult> {
  if (!(await sameOrigin()))
    return { ok: false, error: "The request did not come from this site." };
  const parsed = planPreviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const loaded = await snapshot(parsed.data);
  if (!loaded.ok) return loaded;
  const response = await plannerPost("/api/v1/planner/preview", loaded.body);
  if (!response.ok) return response;
  try {
    const proposal = parsePlanProposal(response.body);
    return {
      ok: true,
      plan: viewFromProposal(proposal, parsed.data, loaded.title, "preview", crypto.randomUUID()),
    };
  } catch {
    return { ok: false, error: "The planner returned a result this app cannot use." };
  }
}

export async function applyPlan(input: unknown): Promise<PlanActionResult> {
  if (!(await sameOrigin()))
    return { ok: false, error: "The request did not come from this site." };
  const parsed = planApplyInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the fields and try again." };
  const loaded = await snapshot(parsed.data);
  if (!loaded.ok) return loaded;
  const response = await plannerPost("/api/v1/planner/apply", {
    approved_hash: parsed.data.payloadHash,
    proposal_id: parsed.data.proposalId,
    plan: loaded.body,
  });
  if (!response.ok) return response;
  let proposal: PlanProposal;
  try {
    proposal = parsePlanProposal(response.body);
  } catch {
    return { ok: false, error: "The planner returned a result this app cannot use." };
  }
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "Sign in to plan. Nothing was scheduled." };
  const { data, error } = await supabase.rpc("apply_planning_proposal", {
    p_work_item_id: parsed.data.workItemId,
    p_expected_version: proposal.versions.work_item.version,
    p_proposal_id: proposal.proposal_id,
    p_payload_hash: proposal.payload_hash,
    p_timezone: loaded.timezone,
    p_blocks: proposal.blocks.map((block) => ({
      starts_at: block.starts_at,
      ends_at: block.ends_at,
    })),
    p_event_versions: proposal.versions.events,
    p_block_versions: proposal.versions.planning_blocks,
    p_effort_versions: proposal.versions.effort_logs,
    p_preferences_version: proposal.versions.preferences,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) {
    if (error.code === "P0002" || error.code === "P0005") {
      return { ok: false, conflict: true, error: "This proposal is stale. Generate it again." };
    }
    if (error.code === "P0003")
      return { ok: false, error: "That save was already sent with different details." };
    return { ok: false, error: "The plan was not saved." };
  }
  const saved = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const savedBlocks = saved && "blocks" in saved && Array.isArray(saved.blocks) ? saved.blocks : [];
  const plan = viewFromProposal(
    proposal,
    parsed.data,
    loaded.title,
    "approved",
    parsed.data.idempotencyKey,
  );
  plan.blocks = plan.blocks.map((block, index) => ({
    ...block,
    id: savedId(savedBlocks[index]) ?? block.id,
    persisted: true,
  }));
  return { ok: true, plan };
}
