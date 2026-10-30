#!/usr/bin/env bash
# PostToolUse hook: auto-lint:fix the edited file, then check its comments.
# Scope: .ts/.tsx/.js/.jsx only. Silent on success; prints errors on failure.
# Lint is non-blocking. Over-long comments exit 2, which feeds the message back to Claude (the edit already happened).

set -u

payload="$(cat 2>/dev/null || true)"
edited=""
if command -v jq >/dev/null 2>&1; then
  edited="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
fi

case "$edited" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$repo_root" ]; then
  exit 0
fi

cd "$repo_root" || exit 0

# Only the edited file: linting the whole diff on every edit grows with the branch. The Stop hook typechecks the rest.
if [ -f "$edited" ] && ! pnpm -s exec eslint --fix --no-warn-ignored "$edited" 2>&1; then
  echo "[lint-changed-files] eslint reported issues (non-blocking)" >&2
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
    fi
    ;;
esac

exit 0
