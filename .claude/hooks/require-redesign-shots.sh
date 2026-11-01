#!/usr/bin/env bash
# Redesign gate (docs/design/redesign/README.md): no client UI edit before the ticket's mockups are open.
# `record` (PostToolUse on Artifact) marks the session once a `shots/` file is read from the artifact;
# `gate` (PreToolUse on Edit|Write) blocks .tsx/.css edits under apps/client/src until that mark exists.

set -u

mode="${1:-}"
payload="$(cat 2>/dev/null || true)"
command -v jq >/dev/null 2>&1 || exit 0

session="$(printf '%s' "$payload" | jq -r '.session_id // "unknown"')"
marker="${TMPDIR:-/tmp}/nebula-redesign-shots/$session"

case "$mode" in
record)
  read_shots="$(printf '%s' "$payload" | jq -r '
    .tool_input as $i
    | select(($i.action // "") == "read")
    | [($i.path // empty), ($i.paths // [] | .[])] | map(select(startswith("shots/"))) | length')"
  if [ "${read_shots:-0}" -gt 0 ] 2>/dev/null; then
    mkdir -p "$(dirname "$marker")" && touch "$marker"
  fi
  ;;
gate)
  file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"
  case "$file" in
  *.test.tsx | */test/*) exit 0 ;;
  */apps/client/src/*.tsx | */apps/client/src/*.css | apps/client/src/*.tsx | apps/client/src/*.css) ;;
  *) exit 0 ;;
  esac
  [ -f "$marker" ] && exit 0
  cat >&2 <<EOF
[require-redesign-shots] BLOCKED: open the redesign mockups before editing client UI ($file).
1. Artifact tool, action "list": take the artifact titled "Nebula Redesign Mockups".
2. Artifact tool, action "read" on its URL with path "shots/<file>.png" for every screenshot your
  ticket names (docs/design/redesign/README.md#screens maps tickets to files), then Read each saved PNG.
3. Retry this edit.
If the Artifact tool is missing or the list has no such artifact, STOP and tell the user: do not build
the UI from the ticket text alone. If the change has no visual surface at all, say so to the user, then
run: mkdir -p "$(dirname "$marker")" && touch "$marker"
EOF
  exit 2
  ;;
esac

exit 0
