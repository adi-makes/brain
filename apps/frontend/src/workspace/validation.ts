import type { QuickAddDraft } from "../demo/types";

export type QuickAddErrors = Partial<Record<keyof QuickAddDraft, string>>;

export function validateQuickAdd(draft: QuickAddDraft): QuickAddErrors {
  const errors: QuickAddErrors = {};
  if (!draft.type) errors.type = "Choose a type.";
  const title = draft.title.trim();
  if (!title) errors.title = "Add a title.";
  else if (title.length > 200) errors.title = "Use 200 characters or fewer.";
  if ((draft.type === "event" || draft.type === "reminder") && !draft.date) {
    errors.date = "Add a date.";
  }
  if (draft.type === "event" && draft.start && draft.end && draft.end <= draft.start) {
    errors.end = "End time must be after the start.";
  }
  if (draft.type === "note" && !draft.body.trim()) errors.body = "Add a note.";
  return errors;
}

export function quickAddIsValid(draft: QuickAddDraft): boolean {
  return Object.keys(validateQuickAdd(draft)).length === 0;
}
