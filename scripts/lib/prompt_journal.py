"""Append-only prompt/response journal.

The journal stores the exact text a Cursor hook receives. It does not store
hidden reasoning, tool output, attachment bytes, or environment secrets.
"""

from __future__ import annotations

import json
import os
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

JOURNAL_NAME = "prompt_responses.md"
LOCK_NAME = "prompt_responses.md.lock"
ENTRY_MARKER = "<!-- second-brain-journal-entry -->"

HEADER = """# Prompt and response journal

Append-only record of Cursor Agent prompts and assistant responses.
Entries are written by the project hook or by the bootstrap and manual-export scripts.
Do not edit earlier entries. Re-runs are appended.

Capture status values:

- `HOOK VERIFIED` — the installed Cursor hook received this text and appended it unchanged.
- `BOOTSTRAP SOURCE: PROMPT PACK FILE` — Phase 00 prompt extracted from `docs/prompts/second_brain_cursor_prompt_pack.md` because the hook did not exist when that prompt was submitted.
- `MANUAL EXPORT REQUIRED` — Cursor did not supply the text. Paste an unchanged export with `scripts/append-manual-journal.py`.
- `PENDING` on `response_status` — a prompt is waiting for its response entry.

Hooks record only fields Cursor sends. They do not record hidden reasoning, tool results, or attachment bytes.
"""

SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
    re.compile(
        r"(?i)\b(?:api[_-]?key|secret|password|passwd|token|service[_-]?role(?:[_-]?key)?)"
        r"\b\s*[:=]\s*['\"]?[^\s'\"]{8,}"
    ),
    re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b"),
)

PHASE_PATTERN = re.compile(r"PHASE\s+0*(\d+)\b", re.IGNORECASE)
SAFE_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class SecretInPromptError(Exception):
    """Raised when text looks like it contains a credential."""


@dataclass(frozen=True)
class JournalEntry:
    entry_id: str
    kind: str
    phase: str
    timestamp_utc: str
    conversation_id: str
    generation_id: str
    cursor_version: str
    capture_status: str
    response_status: str
    pairs_with: str
    attachment_count: str
    text_present: str
    text: str


def repo_root_from(start: Path | None = None) -> Path:
    current = (start or Path.cwd()).resolve()
    for candidate in (current, *current.parents):
        if (candidate / "compose.yaml").is_file() or (candidate / ".git").exists():
            return candidate
    return current


def journal_path(root: Path) -> Path:
    return root / JOURNAL_NAME


def lock_path(root: Path) -> Path:
    return root / LOCK_NAME


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_entry_id(now: str | None = None) -> str:
    stamp = (now or utc_now()).replace("-", "").replace(":", "")
    return f"jrn_{stamp}_{secrets.token_hex(4)}"


def find_secrets(text: str) -> list[str]:
    hits: list[str] = []
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            hits.append(pattern.pattern)
    return hits


def ensure_safe_text(text: str) -> None:
    if find_secrets(text):
        raise SecretInPromptError(
            "Refusing to record text that looks like it contains a credential. "
            "Remove the secret from the prompt and submit again. "
            "The journal was not changed and the text was not redacted."
        )


def fence_for(text: str) -> str:
    longest = 0
    current = 0
    for char in text:
        if char == "`":
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    size = max(3, longest + 1)
    fence = "`" * size
    lines = text.split("\n")
    while any(line.strip() == fence for line in lines):
        size += 1
        fence = "`" * size
    return fence


def phase_from_text(text: str, default: str = "unknown") -> str:
    match = PHASE_PATTERN.search(text)
    if not match:
        return default
    return match.group(1).zfill(2)


def render_entry(entry: JournalEntry) -> str:
    fence = fence_for(entry.text)
    fields = (
        ("kind", entry.kind),
        ("phase", entry.phase),
        ("timestamp_utc", entry.timestamp_utc),
        ("conversation_id", entry.conversation_id),
        ("generation_id", entry.generation_id),
        ("cursor_version", entry.cursor_version),
        ("capture_status", entry.capture_status),
        ("response_status", entry.response_status),
        ("pairs_with", entry.pairs_with),
        ("attachment_count", entry.attachment_count),
        ("text_present", entry.text_present),
    )
    lines = [
        ENTRY_MARKER,
        "",
        f"## {entry.entry_id}",
        "",
    ]
    lines.extend(f"- {key}: {value}" for key, value in fields)
    lines.extend(["", f"{fence}text", entry.text, fence, ""])
    return "\n".join(lines)


def _field_map(block: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in block.splitlines():
        if line.startswith("- ") and ": " in line:
            key, value = line[2:].split(": ", 1)
            fields[key] = value
        elif line.startswith("- ") and line.endswith(":"):
            fields[line[2:-1]] = ""
    return fields


def parse_entries(markdown: str) -> list[JournalEntry]:
    if ENTRY_MARKER not in markdown:
        return []
    parts = markdown.split(ENTRY_MARKER)
    entries: list[JournalEntry] = []
    for part in parts[1:]:
        heading = re.search(r"^## (jrn_[A-Za-z0-9_]+)\s*$", part, re.MULTILINE)
        if not heading:
            continue
        fence_match = re.search(r"\n(`{3,})text\n(.*)\n\1(?:\n|$)", part, re.S)
        text = fence_match.group(2) if fence_match else ""
        fields = _field_map(part.split(f"## {heading.group(1)}", 1)[-1])
        entries.append(
            JournalEntry(
                entry_id=heading.group(1),
                kind=fields.get("kind", ""),
                phase=fields.get("phase", ""),
                timestamp_utc=fields.get("timestamp_utc", ""),
                conversation_id=fields.get("conversation_id", ""),
                generation_id=fields.get("generation_id", ""),
                cursor_version=fields.get("cursor_version", ""),
                capture_status=fields.get("capture_status", ""),
                response_status=fields.get("response_status", ""),
                pairs_with=fields.get("pairs_with", ""),
                attachment_count=fields.get("attachment_count", ""),
                text_present=fields.get("text_present", ""),
                text=text,
            )
        )
    return entries


def read_journal(root: Path) -> str:
    path = journal_path(root)
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def _append_rendered(root: Path, rendered: str) -> None:
    path = journal_path(root)
    lock = lock_path(root)
    lock.touch(exist_ok=True)
    with lock.open("a+", encoding="utf-8") as handle:
        import fcntl

        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            existing = path.read_text(encoding="utf-8") if path.exists() else ""
            if not existing:
                existing = HEADER
                if not existing.endswith("\n"):
                    existing += "\n"
            if existing and not existing.endswith("\n"):
                existing += "\n"
            path.write_text(existing + "\n" + rendered, encoding="utf-8")
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def append_entry(root: Path, entry: JournalEntry) -> JournalEntry:
    if entry.text_present == "true":
        ensure_safe_text(entry.text)
    _append_rendered(root, render_entry(entry))
    return entry


def _clean_id(value: object) -> str:
    if not isinstance(value, str):
        return ""
    value = value.strip()
    if not value or not SAFE_ID.fullmatch(value):
        return ""
    return value


def _string_field(payload: dict[str, object], key: str) -> str | None:
    value = payload.get(key)
    if isinstance(value, str):
        return value
    return None


def pair_target(entries: list[JournalEntry], generation_id: str) -> str:
    if generation_id:
        for entry in reversed(entries):
            if entry.kind == "prompt" and entry.generation_id == generation_id:
                return entry.entry_id
    paired = {entry.pairs_with for entry in entries if entry.kind == "response" and entry.pairs_with}
    for entry in entries:
        if entry.kind == "prompt" and entry.entry_id not in paired:
            return entry.entry_id
    return "UNMATCHED"


def append_prompt(
    root: Path,
    text: str | None,
    *,
    capture_status: str,
    conversation_id: str = "",
    generation_id: str = "",
    cursor_version: str = "",
    attachment_count: int = 0,
    phase: str | None = None,
    response_status: str = "PENDING",
) -> JournalEntry:
    present = text is not None
    body = text if text is not None else ""
    entry = JournalEntry(
        entry_id=new_entry_id(),
        kind="prompt",
        phase=phase or (phase_from_text(body) if present else "unknown"),
        timestamp_utc=utc_now(),
        conversation_id=conversation_id,
        generation_id=generation_id,
        cursor_version=cursor_version,
        capture_status=capture_status,
        response_status=response_status,
        pairs_with="",
        attachment_count=str(attachment_count),
        text_present="true" if present else "false",
        text=body,
    )
    return append_entry(root, entry)


def append_response(
    root: Path,
    text: str | None,
    *,
    capture_status: str,
    conversation_id: str = "",
    generation_id: str = "",
    cursor_version: str = "",
    phase: str | None = None,
    pairs_with: str | None = None,
) -> JournalEntry:
    present = text is not None
    body = text if text is not None else ""
    entries = parse_entries(read_journal(root))
    target = pairs_with if pairs_with else pair_target(entries, generation_id)
    paired_phase = "unknown"
    for entry in entries:
        if entry.entry_id == target:
            paired_phase = entry.phase
            break
    entry = JournalEntry(
        entry_id=new_entry_id(),
        kind="response",
        phase=phase or (phase_from_text(body, paired_phase) if present else paired_phase),
        timestamp_utc=utc_now(),
        conversation_id=conversation_id,
        generation_id=generation_id,
        cursor_version=cursor_version,
        capture_status=capture_status,
        response_status="",
        pairs_with=target,
        attachment_count="0",
        text_present="true" if present else "false",
        text=body,
    )
    return append_entry(root, entry)


def extract_phase_prompt(markdown: str, phase_heading: str = "## Phase 00") -> str:
    heading_at = markdown.find(phase_heading)
    if heading_at < 0:
        raise ValueError(f"Heading not found: {phase_heading}")
    fence_open = markdown.find("```text\n", heading_at)
    if fence_open < 0:
        raise ValueError("Phase prompt text fence not found")
    content_start = fence_open + len("```text\n")
    fence_close = markdown.find("\n```", content_start)
    if fence_close < 0:
        raise ValueError("Phase prompt fence was not closed")
    return markdown[content_start:fence_close]


def bootstrap_phase00(root: Path) -> JournalEntry:
    existing = parse_entries(read_journal(root))
    for entry in existing:
        if entry.capture_status == "BOOTSTRAP SOURCE: PROMPT PACK FILE":
            return entry
    pack = root / "docs" / "prompts" / "second_brain_cursor_prompt_pack.md"
    if not pack.is_file():
        return append_prompt(
            root,
            None,
            capture_status="MANUAL EXPORT REQUIRED",
            phase="00",
            response_status="MANUAL EXPORT REQUIRED",
        )
    text = extract_phase_prompt(pack.read_text(encoding="utf-8"))
    return append_prompt(
        root,
        text,
        capture_status="BOOTSTRAP SOURCE: PROMPT PACK FILE",
        phase="00",
        response_status="PENDING",
    )


def verify_journal(root: Path) -> list[str]:
    entries = parse_entries(read_journal(root))
    if not entries:
        return ["journal has no entries"]
    problems: list[str] = []
    response_targets = {
        entry.pairs_with for entry in entries if entry.kind == "response" and entry.pairs_with
    }
    allowed_open = {"PENDING", "MANUAL EXPORT REQUIRED"}
    for entry in entries:
        if entry.kind != "prompt":
            continue
        if entry.entry_id in response_targets:
            continue
        if entry.response_status in allowed_open:
            continue
        problems.append(
            f"{entry.entry_id} has no response and response_status is "
            f"{entry.response_status or 'empty'}"
        )
    return problems


def handle_hook_payload(root: Path, payload: dict[str, object]) -> dict[str, object]:
    event = _string_field(payload, "hook_event_name") or ""
    conversation_id = _clean_id(payload.get("conversation_id"))
    generation_id = _clean_id(payload.get("generation_id"))
    cursor_version = _string_field(payload, "cursor_version") or ""
    if len(cursor_version) > 80:
        cursor_version = ""

    if event == "beforeSubmitPrompt":
        prompt = payload.get("prompt")
        attachments = payload.get("attachments")
        attachment_count = len(attachments) if isinstance(attachments, list) else 0
        text = prompt if isinstance(prompt, str) else None
        try:
            if text is not None:
                ensure_safe_text(text)
        except SecretInPromptError:
            return {
                "continue": False,
                "user_message": (
                    "The prompt looks like it contains a credential. "
                    "Remove the secret and submit again. It was not written to prompt_responses.md."
                ),
            }
        append_prompt(
            root,
            text,
            capture_status="HOOK VERIFIED" if text is not None else "MANUAL EXPORT REQUIRED",
            conversation_id=conversation_id,
            generation_id=generation_id,
            cursor_version=cursor_version,
            attachment_count=attachment_count,
            response_status="PENDING" if text is not None else "MANUAL EXPORT REQUIRED",
        )
        return {"continue": True}

    if event == "afterAgentResponse":
        text_value = payload.get("text")
        text = text_value if isinstance(text_value, str) else None
        try:
            append_response(
                root,
                text,
                capture_status="HOOK VERIFIED" if text is not None else "MANUAL EXPORT REQUIRED",
                conversation_id=conversation_id,
                generation_id=generation_id,
                cursor_version=cursor_version,
            )
        except SecretInPromptError:
            # The response is already visible. Do not block it, and do not store the secret.
            sys_stderr(
                "afterAgentResponse looked like it contained a credential. "
                "The journal was not updated. Remove the secret from the workspace record manually "
                "if it was shown in chat."
            )
        return {}

    sys_stderr(f"journal hook ignored unsupported event: {event or 'missing'}")
    return {}


def sys_stderr(message: str) -> None:
    os.write(2, (message + "\n").encode("utf-8"))


def load_payload(raw: str) -> dict[str, object]:
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("hook payload must be a JSON object")
    return parsed
