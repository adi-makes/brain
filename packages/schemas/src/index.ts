import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export function parseHealthResponse(value: unknown): HealthResponse {
  return healthResponseSchema.parse(value);
}
