# Prompt and response journal

`prompt_responses.md` is an append-only transcript. Do not rewrite earlier entries.

## What the hook captures

Cursor 3.29.15 implements `beforeSubmitPrompt` and `afterAgentResponse`. The project hook is `.cursor/hooks.json`. Both events run `.cursor/hooks/journal_event.py`.

Official input fields used by the hook, from the Cursor hooks reference:

- Common: `conversation_id`, `generation_id`, `cursor_version`, `hook_event_name`
- `beforeSubmitPrompt`: `prompt`, `attachments` (count only; paths and bytes are not stored)
- `afterAgentResponse`: `text`

The hook does not subscribe to `afterAgentThought`. Hidden reasoning is not written to the journal. Tool results are not treated as the assistant response.

`beforeSubmitPrompt` prints `{"continue": true}` after a successful append. If the prompt text matches a credential pattern, the hook prints `{"continue": false, "user_message": ...}` and writes nothing. It does not redact and then mark the remainder verbatim.

`afterAgentResponse` is observe-only. If the response text matches a credential pattern, the hook writes nothing and reports the refusal on stderr. Cursor still shows the response.

Capture status:

- `HOOK VERIFIED` — this process received the text from the hook payload and appended it unchanged.
- `BOOTSTRAP SOURCE: PROMPT PACK FILE` — the Phase 00 prompt was extracted from `docs/prompts/second_brain_cursor_prompt_pack.md` because the hook did not exist when that prompt was submitted.
- `MANUAL EXPORT REQUIRED` — the text was not supplied. Do not invent it.
- `response_status: PENDING` — the prompt is waiting for a response entry. That state is explicit and is accepted by `scripts/verify-prompt-journal.py`.

Concurrent appends take an exclusive `fcntl` lock on `prompt_responses.md.lock`. Each entry uses a Markdown fence longer than any backtick run inside the text.

## Checks

```bash
python3 -m unittest discover -s scripts/tests -v
pnpm check:prompt-journal
```

## Manual export

Use this when a prompt or response is missing and the capture status says manual export is required. Do not paraphrase.

1. Open the agent chat in Cursor.
2. Open the Hooks output channel (View → Output → Hooks) and confirm whether `journal_event.py` ran for `beforeSubmitPrompt` and `afterAgentResponse`.
3. If Cursor has a chat export command in the chat overflow menu or the Command Palette, save that export and do not edit it.
4. If there is no export command, enable transcripts in Cursor settings if they are off, then resend is not acceptable for an old turn. For a turn that already finished, copy the transcript file from the `transcript_path` value shown in the hook payload when that field is present. If neither an export nor a transcript file exists, leave the entry as `MANUAL EXPORT REQUIRED` and say so in the phase report. Do not type a replacement from memory and mark it verified.
5. Append the unchanged file:

```bash
python3 scripts/append-manual-journal.py \
  --kind prompt \
  --phase 00 \
  --source-file /absolute/path/to/export.md

python3 scripts/append-manual-journal.py \
  --kind response \
  --phase 00 \
  --source-file /absolute/path/to/response.md \
  --pairs-with jrn_...
```

The script stores the file's UTF-8 text and sets `MANUAL EXPORT REQUIRED`. It refuses credential-shaped text instead of redacting it.

## Bootstrap

```bash
python3 scripts/bootstrap-prompt-journal.py
```

This is idempotent. It records the Phase 00 prompt from the tracked prompt pack.
