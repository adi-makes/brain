# Development standards

- TypeScript is strict. Do not add `any`, unsafe casts, or ignored errors to get a phase to pass.
- Python is typed and formatted with Ruff. Validate boundaries with Pydantic or Zod.
- Keep domain rules in one place. The planner rule is ADR 0004.
- User-owned data must be authorized on the server. Never trust a client-supplied `user_id`.
- AI may propose changes. It must not write user data without the approval rules in Part A.
- Do not add fake buttons, mock success, or product screens in a phase that does not call for them.
- Prefer maintained libraries already required by the phase. Do not add UI kits, Redis, Ollama, or Supabase clients ahead of the phase that uses them.
- Lockfiles are committed. CI installs with frozen lockfiles.
- Commit on a phase branch. Inspect the diff. Do not commit `.env`, credentials, or build output.
- Do not force-push or push `main` directly.
- Record skipped checks in the phase report. A command that was not run did not pass.
