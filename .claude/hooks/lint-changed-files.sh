#!/usr/bin/env bash
# PostToolUse hook: auto-lint:fix files changed since last commit, then check the edited file's comments.
# Scope: .ts/.tsx/.js/.jsx only. Silent on success; prints errors on failure.
# Lint is non-blocking. Over-long comments exit 2, which feeds the message back to Claude (the edit already happened).

set -u

# The payload names the edited file; lint scope still comes from git diff.
payload="$(cat 2>/dev/null || true)"
edited=""
if command -v jq >/dev/null 2>&1; then
  edited="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
  exit 0
fi

cd "$repo_root" || exit 0

mapfile -t changed < <(git diff --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null; \
                       git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null)

if [ "${#changed[@]}" -gt 0 ]; then
  # Deduplicate, then run eslint on changed files only. Use pnpm exec for workspace-aware resolution.
  mapfile -t files < <(printf '%s\n' "${changed[@]}" | sort -u)
  if ! pnpm -s exec eslint --fix --no-warn-ignored "${files[@]}" 2>&1; then
    echo "[lint-changed-files] eslint reported issues (non-blocking)" >&2
  fi
fi

# Comment budget (AGENTS.md): one line, two at most. Counts prose lines per block in the edited file.
case "$edited" in
  *.gen.ts|*/generated/*|*.test.ts|*.test.tsx) ;;
  *.ts|*.tsx)
    if [ -f "$edited" ]; then
      long="$(awk '
        function flush() { if (n >= 3) printf "%s:%d: %d-line comment\n", FILENAME, start, n; n = 0 }
        /^[[:space:]]*\/\*/ { inblk = 1; start = FNR; n = 0 }
        inblk { t = $0; gsub(/^[[:space:]]*(\/\*+|\*\/|\*)[[:space:]]?/, "", t); gsub(/[[:space:]]*\*\/.*$/, "", t); if (t != "" && t !~ /^@/) n++ }
        inblk && /\*\// { inblk = 0; flush(); next }
        inblk { next }
        /^[[:space:]]*\/\/[^\/]/ && !/eslint|@ts-|prettier/ { if (n == 0) start = FNR; n++; next }
        { flush() }
      ' "$edited")"
      if [ -n "$long" ]; then
        echo "[lint-changed-files] comments over the two-line budget; keep only the why:" >&2
        echo "$long" >&2
        exit 2
      fi
    fi ;;
esac

exit 0
