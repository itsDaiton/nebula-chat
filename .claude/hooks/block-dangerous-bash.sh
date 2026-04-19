#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks destructive commands.
# Reads the tool-call JSON from stdin, matches on the `command` field,
# and exits non-zero with a message to abort the call.

set -u

payload="$(cat)"

# Extract the command string. Tolerate either jq presence or plain grep fallback.
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"
else
  cmd="$(printf '%s' "$payload" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/^.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"$/\1/')"
fi

if [ -z "$cmd" ]; then
  exit 0
fi

block() {
  echo "[block-dangerous-bash] BLOCKED: $1" >&2
  echo "Command: $cmd" >&2
  exit 2
}

case "$cmd" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf \$HOME"*) block "rm -rf of root/home directory" ;;
  *"rm -rf ."*|*"rm -rf ./"*|*"rm -rf *"*)      block "rm -rf of working tree" ;;
  *"git push"*"--force"*|*"git push"*"-f "*)   block "git push with force options (all force pushes are blocked)" ;;
  *"git reset --hard"*)                          block "git reset --hard (destructive)" ;;
  *"git clean -fd"*|*"git clean -fdx"*)         block "git clean -fd (destructive)" ;;
  *"prisma migrate reset"*)                     block "prisma migrate reset (drops dev DB)" ;;
  *"DROP TABLE"*|*"DROP DATABASE"*|*"TRUNCATE"*) block "destructive SQL statement" ;;
  *"docker-compose down -v"*|*"docker compose down -v"*) block "docker-compose down -v (deletes volumes)" ;;
  *":(){ :|:& };:"*)                            block "fork bomb" ;;
  *"--no-verify"*)                              block "--no-verify (skips git hooks)" ;;
esac

exit 0
