#!/usr/bin/env bash
# SessionStart hook. Cloud sessions: install deps and build workspace libs, which typecheck and tests need.
# After compaction (any session): restate the branch and its ticket so the summary can't lose them.

set -euo pipefail

payload="$(cat 2>/dev/null || true)"
source="$(printf '%s' "$payload" | jq -r '.source // empty' 2>/dev/null || true)"
cd "${CLAUDE_PROJECT_DIR:-.}"

if [ "$source" = "compact" ]; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  ticket="$(printf '%s' "$branch" | grep -oiE 'neb-[0-9]+' | head -1 || true)"
  echo "Current branch: ${branch:-detached}${ticket:+ (ticket ${ticket^^})}."
  exit 0
fi

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

pnpm install --frozen-lockfile >&2
pnpm build:libs >&2
