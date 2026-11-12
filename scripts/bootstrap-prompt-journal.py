#!/usr/bin/env python3
"""Initialize prompt_responses.md from the tracked prompt pack.

Phase 00 is submitted before project hooks exist, so this extracts the exact
Phase 00 fence from docs/prompts/second_brain_cursor_prompt_pack.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.prompt_journal import bootstrap_phase00  # noqa: E402


def main() -> int:
    entry = bootstrap_phase00(ROOT)
    sys.stdout.write(
        f"{entry.entry_id} capture_status={entry.capture_status} "
        f"text_present={entry.text_present}\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
