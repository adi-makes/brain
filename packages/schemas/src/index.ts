import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function parseHealthResponse(value: unknown): HealthResponse {
  return healthResponseSchema.parse(value);
}

export {
  categories,
  editScopes,
  eventInputSchema,
  eventUpdateSchema,
  frequencies,
  noteInputSchema,
  noteUpdateSchema,
  reminderChannels,
  reminderInputSchema,
  reminderUpdateSchema,
  severities,
  surfaceActionSchema,
  workItemInputSchema,
  workItemStatusSchema,
  workItemUpdateSchema,
  workStatuses,
} from "./productivity";
export type { EventInput, NoteInput, ReminderInput, WorkItemInput } from "./productivity";
