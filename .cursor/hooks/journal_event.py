#!/usr/bin/env python3
"""Cursor hook: journal beforeSubmitPrompt and afterAgentResponse.

Reads one JSON object from stdin. Prints a JSON object to stdout.
Does not record afterAgentThought, tool output, or hidden reasoning.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.prompt_journal import handle_hook_payload, load_payload, repo_root_from  # noqa: E402


def hook_root() -> Path:
    cwd = Path.cwd().resolve()
    if (cwd / "compose.yaml").is_file():
        return cwd
    return repo_root_from(ROOT)


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = load_payload(raw) if raw.strip() else {}
        result = handle_hook_payload(hook_root(), payload)
    except Exception as exc:  # noqa: BLE001 — hook must fail open with valid JSON
        sys.stderr.write(f"journal hook error: {exc.__class__.__name__}\n")
        event = ""
        try:
            parsed = json.loads(raw) if raw.strip() else {}
            if isinstance(parsed, dict) and isinstance(parsed.get("hook_event_name"), str):
                event = parsed["hook_event_name"]
        except json.JSONDecodeError:
            event = ""
        if event == "beforeSubmitPrompt":
            result = {"continue": True}
        else:
            result = {}
    sys.stdout.write(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
