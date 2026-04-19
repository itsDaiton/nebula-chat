#!/usr/bin/env bash
# PostToolUse hook: auto-lint:fix files changed since last commit.
# Scope: .ts/.tsx/.js/.jsx only. Silent on success; prints errors on failure.
# Non-blocking: always exits 0 so Claude Code keeps working; surfaces output via stderr.

set -u

# Read hook payload from stdin but don't rely on it — use git diff for scope.
cat >/dev/null 2>&1 || true

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
  exit 0
fi

cd "$repo_root" || exit 0

mapfile -t changed < <(git diff --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null; \
                       git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null)

if [ "${#changed[@]}" -eq 0 ]; then
  exit 0
fi

# Deduplicate.
mapfile -t files < <(printf '%s\n' "${changed[@]}" | sort -u)

# Run eslint on changed files only. Use pnpm exec for workspace-aware resolution.
if ! pnpm -s exec eslint --fix --no-warn-ignored "${files[@]}" 2>&1; then
  echo "[lint-changed-files] eslint reported issues (non-blocking)" >&2
fi

exit 0
