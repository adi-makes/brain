#!/bin/sh
# Install the repository pre-commit hook into .git/hooks.
# This does not change git config.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
mkdir -p "$root/.git/hooks"
cp "$root/.githooks/pre-commit" "$root/.git/hooks/pre-commit"
chmod +x "$root/.git/hooks/pre-commit" "$root/scripts/verify-commit-safety.sh"
echo "installed .git/hooks/pre-commit"
