"use client";

import { useState } from "react";
import type { PlanOverrides } from "../calendar/plan-display";
import { useWorkspace } from "../workspace/store";

export function PlanPanel() {
  const { plan, planning, requestPlan, approvePlan, rejectPlan } = useWorkspace();
  const [dailyLoad, setDailyLoad] = useState(plan?.overrides.dailyLoadMinutes ?? 240);
  const [preferredStart, setPreferredStart] = useState(plan?.overrides.preferredStart ?? "09:00");
  const [preferredEnd, setPreferredEnd] = useState(plan?.overrides.preferredEnd ?? "12:00");
  if (!plan) return null;
  const overrides: Partial<PlanOverrides> = {
    dailyLoadMinutes: dailyLoad,
    preferredStart,
    preferredEnd,
  };
  const status =
    plan.status === "approved"
      ? "Approved. Planned time is not completed work."
      : plan.status === "rejected"
        ? "Rejected. Nothing was saved."
        : "Proposed, not saved.";
  return (
    <section
      id="planning-preview"
      tabIndex={-1}
      aria-label="Planning preview"
      className="border-b border-line px-4 py-4 outline-none"
    >
      <h2 className="text-pretty text-[11px] uppercase tracking-[0.14em] text-muted">Planning</h2>
      <p className="mt-3 text-sm text-ink">{status}</p>
      <p className="mt-1 text-sm text-ink">{plan.summary}</p>
      <p className="mt-2 text-xs text-muted">
        Remaining {plan.remainingMinutes} min. Reserved {plan.reservedMinutes} min. Scheduled{" "}
        {plan.scheduledMinutes} min. Unscheduled {plan.unscheduledMinutes} min.
      </p>
      {plan.blocks.map((block) => (
        <p key={block.id} className="mt-2 text-sm text-ink">
          {block.persisted ? "Planned" : "Proposed"} {block.start}–{block.end}. {block.reason}
        </p>
      ))}
      {plan.alternatives.map((item) => (
        <p key={item.summary} className="mt-2 text-xs text-muted">
          Alternative: {item.summary} {item.reason}
        </p>
      ))}
      <div className="mt-3 grid gap-2">
        <label className="text-xs text-muted" htmlFor="plan-load">
          Daily load in minutes
          <input
            id="plan-load"
            type="number"
            min={15}
            max={1440}
            value={dailyLoad}
            onChange={(event) => setDailyLoad(Number(event.target.value))}
            className="mt-1 block min-h-11 w-full rounded-[10px] border border-line bg-canvas px-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-muted" htmlFor="plan-preferred-start">
          Preferred start
          <input
            id="plan-preferred-start"
            value={preferredStart}
            onChange={(event) => setPreferredStart(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-[10px] border border-line bg-canvas px-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs text-muted" htmlFor="plan-preferred-end">
          Preferred end
          <input
            id="plan-preferred-end"
            value={preferredEnd}
            onChange={(event) => setPreferredEnd(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-[10px] border border-line bg-canvas px-2 text-sm text-ink"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={planning || plan.blocks.length === 0 || plan.status !== "preview"}
          onClick={approvePlan}
          className="cursor-pointer min-h-11 rounded-[10px] bg-accent px-3 text-sm text-canvas disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={planning || plan.status === "rejected"}
          onClick={rejectPlan}
          className="cursor-pointer min-h-11 rounded-[10px] border border-line px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={planning}
          onClick={() => requestPlan(plan.workItemId, overrides)}
          className="cursor-pointer min-h-11 rounded-[10px] px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          Update preview
        </button>
      </div>
    </section>
  );
}
