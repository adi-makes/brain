from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.prompt_journal import (  # noqa: E402
    SecretInPromptError,
    append_prompt,
    append_response,
    extract_phase_prompt,
    fence_for,
    handle_hook_payload,
    parse_entries,
    read_journal,
    verify_journal,
)


class PromptJournalTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "compose.yaml").write_text("name: test\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_multiline_unicode_and_backticks_round_trip(self) -> None:
        text = "line one\nline two with ``` and ````\n今日の予定 — café\n"
        append_prompt(
            self.root,
            text,
            capture_status="HOOK VERIFIED",
            conversation_id="conv-1",
            generation_id="gen-1",
            phase="00",
        )
        entries = parse_entries(read_journal(self.root))
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].text, text)
        self.assertIn("今日の予定 — café", read_journal(self.root))
        self.assertGreaterEqual(len(fence_for(text)), 5)

    def test_repeated_events_append(self) -> None:
        payload = {
            "hook_event_name": "beforeSubmitPrompt",
            "prompt": "same prompt",
            "conversation_id": "conv-1",
            "generation_id": "gen-repeat",
            "cursor_version": "3.29.15",
            "attachments": [],
        }
        first = handle_hook_payload(self.root, payload)
        second = handle_hook_payload(self.root, payload)
        self.assertEqual(first, {"continue": True})
        self.assertEqual(second, {"continue": True})
        entries = parse_entries(read_journal(self.root))
        self.assertEqual(len(entries), 2)
        self.assertEqual(entries[0].text, "same prompt")
        self.assertEqual(entries[1].text, "same prompt")

    def test_response_pairs_with_prompt_and_verify_passes(self) -> None:
        handle_hook_payload(
            self.root,
            {
                "hook_event_name": "beforeSubmitPrompt",
                "prompt": "PHASE 00 hello",
                "conversation_id": "conv-1",
                "generation_id": "gen-2",
            },
        )
        handle_hook_payload(
            self.root,
            {
                "hook_event_name": "afterAgentResponse",
                "text": "response body\nsecond line",
                "conversation_id": "conv-1",
                "generation_id": "gen-2",
            },
        )
        entries = parse_entries(read_journal(self.root))
        self.assertEqual(entries[1].kind, "response")
        self.assertEqual(entries[1].pairs_with, entries[0].entry_id)
        self.assertEqual(entries[1].text, "response body\nsecond line")
        self.assertEqual(verify_journal(self.root), [])

    def test_pending_prompt_is_explicitly_allowed(self) -> None:
        append_prompt(
            self.root,
            "PHASE 00 waiting",
            capture_status="BOOTSTRAP SOURCE: PROMPT PACK FILE",
            phase="00",
            response_status="PENDING",
        )
        self.assertEqual(verify_journal(self.root), [])

    def test_prompt_without_status_or_response_fails_verification(self) -> None:
        append_prompt(
            self.root,
            "PHASE 00 orphan",
            capture_status="HOOK VERIFIED",
            phase="00",
            response_status="",
        )
        problems = verify_journal(self.root)
        self.assertEqual(len(problems), 1)

    def test_secret_assignment_is_refused_and_not_written(self) -> None:
        key_name = "api" + "_key"
        payload = {
            "hook_event_name": "beforeSubmitPrompt",
            "prompt": f"{key_name}=supersecretvalue",
        }
        result = handle_hook_payload(self.root, payload)
        self.assertFalse(result["continue"])
        self.assertIn("credential", str(result["user_message"]))
        self.assertFalse((self.root / "prompt_responses.md").exists())

    def test_secret_response_is_not_stored(self) -> None:
        append_prompt(self.root, "hello", capture_status="HOOK VERIFIED", phase="00")
        token = "ghp_" + ("a" * 36)
        result = handle_hook_payload(
            self.root,
            {"hook_event_name": "afterAgentResponse", "text": f"token {token}"},
        )
        self.assertEqual(result, {})
        entries = parse_entries(read_journal(self.root))
        self.assertEqual(len(entries), 1)

    def test_concurrent_appends_keep_both_bodies_intact(self) -> None:
        errors: list[BaseException] = []

        def worker(marker: str) -> None:
            try:
                body = "\n".join([marker] * 40)
                append_prompt(self.root, body, capture_status="HOOK VERIFIED", phase="00")
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [threading.Thread(target=worker, args=(f"marker-{index}",)) for index in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertEqual(errors, [])
        journal = read_journal(self.root)
        entries = parse_entries(journal)
        self.assertEqual(len(entries), 8)
        markers = {entry.text.splitlines()[0] for entry in entries}
        self.assertEqual(markers, {f"marker-{index}" for index in range(8)})
        for entry in entries:
            self.assertEqual(len(entry.text.splitlines()), 40)

    def test_phase00_extractor_matches_prompt_pack(self) -> None:
        pack = ROOT / "docs" / "prompts" / "second_brain_cursor_prompt_pack.md"
        text = extract_phase_prompt(pack.read_text(encoding="utf-8"))
        self.assertTrue(text.startswith("# SECOND BRAIN — PHASE 00: REPOSITORY FOUNDATION"))
        self.assertTrue(text.endswith("Stop. Do not start Phase 01."))
        self.assertNotIn("```", text[:20])

    def test_hook_script_prints_json(self) -> None:
        script = ROOT / ".cursor" / "hooks" / "journal_event.py"
        completed = subprocess.run(
            [sys.executable, str(script)],
            input=json.dumps(
                {
                    "hook_event_name": "beforeSubmitPrompt",
                    "prompt": "PHASE 00 from stdin\nline 2",
                    "conversation_id": "conv",
                    "generation_id": "gen",
                }
            ),
            text=True,
            capture_output=True,
            cwd=self.root,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout), {"continue": True})

    def test_manual_export_status_constant(self) -> None:
        with self.assertRaises(SecretInPromptError):
            append_response(
                self.root,
                "password=" + ("n" * 12),
                capture_status="MANUAL EXPORT REQUIRED",
            )


if __name__ == "__main__":
    unittest.main()
