#!/usr/bin/env bash
# SessionStart hook (compact only): restate the branch and its ticket so the summary can't lose them.
# Cloud installs and lib builds live in the environment's setup script, not here.

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
branch="$(git branch --show-current 2>/dev/null || true)"
ticket="$(printf '%s' "$branch" | grep -oiE 'neb-[0-9]+' | head -1 || true)"
echo "Current branch: ${branch:-detached}${ticket:+ (ticket ${ticket^^})}."
