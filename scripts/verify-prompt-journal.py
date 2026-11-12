#!/usr/bin/env python3
"""Confirm each journaled prompt has a response or an explicit open status."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.prompt_journal import parse_entries, read_journal, verify_journal  # noqa: E402


def main() -> int:
    problems = verify_journal(ROOT)
    entries = parse_entries(read_journal(ROOT))
    prompts = [entry for entry in entries if entry.kind == "prompt"]
    responses = [entry for entry in entries if entry.kind == "response"]
    pending = [entry.entry_id for entry in prompts if entry.response_status == "PENDING"]
    sys.stdout.write(
        f"prompts={len(prompts)} responses={len(responses)} pending={len(pending)}\n"
    )
    if problems:
        for problem in problems:
            sys.stderr.write(f"prompt journal: {problem}\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
