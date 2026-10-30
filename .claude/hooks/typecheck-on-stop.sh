#!/usr/bin/env bash
# Stop hook: when uncommitted TypeScript changes exist, typecheck the affected packages before Claude finishes.
# On failure it blocks the stop and hands Claude the first errors; stop_hook_active prevents a retry loop.

set -u

payload="$(cat 2>/dev/null || true)"
if command -v jq >/dev/null 2>&1 &&
  [ "$(printf '%s' "$payload" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
  exit 0
fi

cd "$repo_root" || exit 0

changed="$(
  git diff HEAD --name-only -- '*.ts' '*.tsx' 2>/dev/null
  git ls-files --others --exclude-standard -- '*.ts' '*.tsx' 2>/dev/null
)"
if [ -z "$changed" ]; then
  exit 0
fi

if out="$(pnpm turbo run typecheck --filter='...[HEAD]' --output-logs=errors-only 2>&1)"; then
  exit 0
fi

# Block only on real type errors; a broken toolchain is reported to the user, not looped on.
errors="$(printf '%s\n' "$out" | grep -E 'error TS[0-9]+' | head -40)"
if [ -z "$errors" ]; then
  echo "[typecheck-on-stop] typecheck failed without TS errors; check the toolchain:" >&2
  printf '%s\n' "$out" | tail -5 >&2
  exit 0
fi

jq -n --arg reason "Typecheck failed for the packages you changed. Fix these before finishing:
$errors" '{decision: "block", reason: $reason}'
exit 0
