#!/bin/sh
# Local pre-commit verification. Does not modify git configuration.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"

node scripts/check-env-layout.mjs
python3 scripts/verify-prompt-journal.py
python3 scripts/scan-secrets.py

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git diff --cached --name-only | grep -E '(^|/)\.env$' >/dev/null; then
    echo "refusing to commit a .env file" >&2
    exit 1
  fi
fi
