#!/usr/bin/env bash
# PreToolUse hook: blocks a PR or issue title that pr-title.yml / validate-ticket.yml would fail,
# before it reaches GitHub. Mirrors the rules in AGENTS.md → Tickets.

set -u

payload="$(cat)"
command -v jq >/dev/null 2>&1 || exit 0

title="$(printf '%s' "$payload" | jq -r '.tool_input.title // empty')"
if [ -z "$title" ]; then
  cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"
  [[ "$cmd" =~ gh[[:space:]]+(pr|issue)[[:space:]]+(create|edit) ]] || exit 0
  title_re="(--title|-t)[[:space:]=]+(\"([^\"]*)\"|'([^']*)')"
  [[ "$cmd" =~ $title_re ]] || exit 0
  title="${BASH_REMATCH[3]}${BASH_REMATCH[4]}"
fi

block() {
  echo "[check-pr-title] BLOCKED: $1" >&2
  echo "Title: $title" >&2
  echo "Expected: feat|fix(scope): NEB-<n> summary, or feat|fix(scope): summary for ad-hoc work." >&2
  exit 2
}

if [[ "$title" == *"<"* || "$title" == *">"* ]]; then
  block "'<' or '>' makes Release Please skip every release after the first"
fi

prefix_re='^(feat|fix)(\([a-z0-9-]+(, ?[a-z0-9-]+)*\))?!?: (.*)$'
[[ "$title" =~ $prefix_re ]] || block "only feat/fix (optionally with a scope and !) are released"
summary="${BASH_REMATCH[4]}"

if [[ "$summary" == NEB-* ]]; then
  [[ "$summary" =~ ^NEB-[0-9]+[[:space:]][^[:space:]] ]] || block "write the ID as 'NEB-<n> summary', no colon after it"
elif [[ ! "$summary" =~ ^[^[:space:]] ]]; then
  block "the summary is empty"
fi

if [ "${#title}" -ge 72 ]; then
  block "the title is the squash commit subject and must stay under 72 characters"
fi

exit 0
