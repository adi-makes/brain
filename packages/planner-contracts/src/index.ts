import { z } from "zod";

const clock = z.string().regex(/^\d{2}:\d{2}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const planOutcomes = [
  "feasible",
  "insufficient_capacity",
  "infeasible",
  "overdue",
  "already_planned",
] as const;

export const ghostBlockSchema = z.object({
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  minutes: z.number().int().positive(),
  timezone: z.string().min(1),
  local_date: day,
  local_start: clock,
  local_end: clock,
  reason: z.string().min(1),
  in_preferred_window: z.boolean(),
  daily_minutes_after: z.number().int().nonnegative(),
});

export const planProposalSchema = z.object({
  proposal_id: z.string().uuid(),
  payload_hash: z.string().min(32),
  outcome: z.enum(planOutcomes),
  summary: z.string().min(1),
  blocks: z.array(ghostBlockSchema),
  alternatives: z.array(
    z.object({
      summary: z.string().min(1),
      starts_at: z.string().min(1).nullable().optional(),
      reason: z.string().min(1),
    }),
  ),
  remaining_minutes: z.number().int().nonnegative(),
  reserved_minutes: z.number().int().nonnegative(),
  scheduled_minutes: z.number().int().nonnegative(),
  unscheduled_minutes: z.number().int().nonnegative(),
  horizon_minutes: z.number().int().nonnegative(),
  safety_deadline: z.string().nullable(),
  deadline: z.string().nullable(),
  versions: z.object({
    work_item: z.object({ id: z.string().uuid(), version: z.number().int() }),
    events: z.array(z.object({ id: z.string().uuid(), version: z.number().int() })),
    planning_blocks: z.array(z.object({ id: z.string().uuid(), version: z.number().int() })),
    effort_logs: z.array(z.object({ id: z.string().uuid(), version: z.number().int() })),
    preferences: z.number().int().nonnegative(),
  }),
});

export const planPreviewInputSchema = z.object({
  workItemId: z.string().uuid(),
  dailyLoadMinutes: z.number().int().min(15).max(1440).optional(),
  preferredStart: clock.optional(),
  preferredEnd: clock.optional(),
});

export const planApplyInputSchema = planPreviewInputSchema.extend({
  proposalId: z.string().uuid(),
  payloadHash: z.string().min(32),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export type GhostBlock = z.infer<typeof ghostBlockSchema>;
export type PlanProposal = z.infer<typeof planProposalSchema>;
export type PlanPreviewInput = z.infer<typeof planPreviewInputSchema>;
export type PlanApplyInput = z.infer<typeof planApplyInputSchema>;

export function parsePlanProposal(value: unknown): PlanProposal {
  return planProposalSchema.parse(value);
}
