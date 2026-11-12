#!/usr/bin/env python3
"""Append an unchanged exported prompt or response.

Use this only when capture status is MANUAL EXPORT REQUIRED.
The file is stored as decoded UTF-8 text with no edits.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.prompt_journal import SecretInPromptError, append_prompt, append_response  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=("prompt", "response"), required=True)
    parser.add_argument("--phase", required=True, help="Phase number, for example 00")
    parser.add_argument("--source-file", required=True, type=Path)
    parser.add_argument("--pairs-with", default="", help="Prompt entry id for a response")
    args = parser.parse_args()

    source = args.source_file
    if not source.is_file():
        sys.stderr.write(f"source file not found: {source}\n")
        return 1
    text = source.read_text(encoding="utf-8")
    phase = args.phase.zfill(2)
    try:
        if args.kind == "prompt":
            entry = append_prompt(
                ROOT,
                text,
                capture_status="MANUAL EXPORT REQUIRED",
                phase=phase,
                response_status="MANUAL EXPORT REQUIRED",
            )
        else:
            entry = append_response(
                ROOT,
                text,
                capture_status="MANUAL EXPORT REQUIRED",
                phase=phase,
                pairs_with=args.pairs_with or None,
            )
    except SecretInPromptError as exc:
        sys.stderr.write(f"{exc}\n")
        return 2
    sys.stdout.write(f"appended {entry.entry_id} capture_status={entry.capture_status}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
