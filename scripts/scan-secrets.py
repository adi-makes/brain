#!/usr/bin/env python3
"""Scan the work tree for committed secrets.

Prefers a local gitleaks binary, then gitleaks via Docker. If neither is
available, runs a small pattern scan and says so. The fallback is not a
substitute for gitleaks.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    ".next",
    ".venv",
    ".turbo",
    "__pycache__",
    "node_modules",
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
}
PATTERNS = (
    "-----BEGIN PRIVATE KEY-----",
    "-----BEGIN RSA PRIVATE KEY-----",
    "AKIA",
    "ghp_",
    "github_pat_",
    "xoxb-",
)


def run(command: list[str]) -> int:
    completed = subprocess.run(command, cwd=ROOT, check=False)
    return completed.returncode


def gitleaks_binary() -> int | None:
    binary = shutil.which("gitleaks")
    if not binary:
        return None
    print(f"secret scan: gitleaks ({binary})", flush=True)
    return run(
        [
            binary,
            "detect",
            "--source",
            str(ROOT),
            "--config",
            str(ROOT / ".gitleaks.toml"),
            "--redact",
            "--no-banner",
            "--no-git",
            "--verbose",
        ]
    )


def gitleaks_docker() -> int | None:
    if not shutil.which("docker"):
        return None
    print("secret scan: gitleaks via docker image ghcr.io/gitleaks/gitleaks:v8.30.0", flush=True)
    return run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{ROOT}:/repo",
            "ghcr.io/gitleaks/gitleaks:v8.30.0",
            "detect",
            "--source",
            "/repo",
            "--config",
            "/repo/.gitleaks.toml",
            "--redact",
            "--no-banner",
            "--no-git",
            "--verbose",
        ]
    )


def fallback_scan() -> int:
    print(
        "secret scan: gitleaks is not installed and Docker gitleaks did not run; "
        "using the builtin pattern scan",
        flush=True,
    )
    findings: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for filename in filenames:
            path = Path(dirpath) / filename
            if path.suffix in {".png", ".jpg", ".webp", ".lock"}:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for pattern in PATTERNS:
                if pattern in text and "scripts/tests" not in str(path.relative_to(ROOT)):
                    findings.append(f"{path.relative_to(ROOT)} matched {pattern}")
    if findings:
        for finding in findings:
            print(finding, file=sys.stderr)
        return 1
    print("builtin secret scan: no findings", flush=True)
    return 0


def main() -> int:
    binary_result = gitleaks_binary()
    if binary_result is not None:
        return binary_result
    docker_result = gitleaks_docker()
    if docker_result is not None and docker_result != 125:
        return docker_result
    if docker_result == 125:
        print("secret scan: docker could not start gitleaks; falling back", file=sys.stderr)
    return fallback_scan()


if __name__ == "__main__":
    raise SystemExit(main())
