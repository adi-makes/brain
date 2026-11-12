import { z } from "zod";

export const categories = ["personal", "home", "work", "admin", "learning"] as const;
export const severities = ["critical", "high", "medium", "low"] as const;
export const workStatuses = ["open", "done", "cancelled"] as const;
export const frequencies = ["daily", "weekly", "monthly", "yearly"] as const;
export const editScopes = ["one", "following", "all"] as const;
export const reminderChannels = ["in_app", "email", "push"] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clock = z.string().regex(/^\d{2}:\d{2}$/);
const key = z.string().trim().min(8).max(200);

export const workItemInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20000),
    category: z.enum(categories),
    severity: z.enum(severities),
    dueOn: date.nullable(),
    dueAt: z.string().datetime().nullable(),
    estimateMinutes: z.number().int().min(0).max(20160).nullable(),
    idempotencyKey: key,
  })
  .refine((value) => value.dueOn === null || value.dueAt === null, {
    message: "Use either a date or a time, not both.",
  });

export const workItemUpdateSchema = workItemInputSchema.and(
  z.object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
  }),
);

export const workItemStatusSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  status: z.enum(workStatuses),
  idempotencyKey: key,
});

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20000),
    category: z.enum(categories),
    allDay: z.boolean(),
    startsOn: date,
    endsOn: date.nullable(),
    localStart: clock.nullable(),
    localEnd: clock.nullable(),
    timezone: z.string().trim().min(1).max(80),
    location: z.string().max(200),
    frequency: z.enum(frequencies).nullable(),
    interval: z.number().int().min(1).max(52).nullable(),
    untilOn: date.nullable(),
    occurrenceCount: z.number().int().min(1).max(366).nullable(),
    idempotencyKey: key,
  })
  .refine((value) => value.untilOn === null || value.occurrenceCount === null, {
    message: "Choose either an end date or a count.",
  })
  .refine(
    (value) =>
      value.allDay
        ? value.endsOn !== null && value.endsOn >= value.startsOn
        : value.localStart !== null && value.localEnd !== null && value.localEnd > value.localStart,
    { message: "Check the event times." },
  );

export const eventUpdateSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  scope: z.enum(editScopes),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(20000),
  category: z.enum(categories),
  allDay: z.boolean(),
  startsOn: date,
  endsOn: date.nullable(),
  localStart: clock.nullable(),
  localEnd: clock.nullable(),
  timezone: z.string().trim().min(1).max(80),
  location: z.string().max(200),
  idempotencyKey: key,
});

export const noteUpdateSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  workItemId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  idempotencyKey: key,
});

export const reminderUpdateSchema = z
  .object({
    id: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1).max(200),
    workItemId: z.string().uuid().nullable(),
    eventId: z.string().uuid().nullable(),
    remindAt: z.string().datetime().nullable(),
    remindOn: date.nullable(),
    offsetMinutes: z.number().int().min(-10080).max(10080).nullable(),
    channel: z.enum(reminderChannels),
    status: z.enum(["active", "cancelled"]),
    idempotencyKey: key,
  })
  .refine((value) => value.workItemId === null || value.eventId === null, {
    message: "Link a reminder to one record.",
  })
  .refine(
    (value) =>
      [value.remindAt, value.remindOn, value.offsetMinutes].filter((item) => item !== null)
        .length === 1,
    { message: "Choose one reminder schedule." },
  )
  .refine((value) => value.offsetMinutes === null || value.eventId !== null, {
    message: "An offset reminder needs an event.",
  });

export const noteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
  workItemId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  idempotencyKey: key,
});

export const reminderInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    workItemId: z.string().uuid().nullable(),
    eventId: z.string().uuid().nullable(),
    remindAt: z.string().datetime().nullable(),
    remindOn: date.nullable(),
    offsetMinutes: z.number().int().min(-10080).max(10080).nullable(),
    channel: z.enum(reminderChannels),
    idempotencyKey: key,
  })
  .refine((value) => value.workItemId === null || value.eventId === null, {
    message: "Link a reminder to one record.",
  })
  .refine(
    (value) =>
      [value.remindAt, value.remindOn, value.offsetMinutes].filter((item) => item !== null)
        .length === 1,
    { message: "Choose one reminder schedule." },
  )
  .refine((value) => value.offsetMinutes === null || value.eventId !== null, {
    message: "An offset reminder needs an event.",
  });

export type WorkItemInput = z.infer<typeof workItemInputSchema>;
export type EventInput = z.infer<typeof eventInputSchema>;
export type NoteInput = z.infer<typeof noteInputSchema>;
export type ReminderInput = z.infer<typeof reminderInputSchema>;
