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

# Block `rm` with an rf-flag ONLY when the target is a standalone dangerous token:
#   /, ~, ~/, $HOME, $HOME/, ., ./, .., ../, *, /*, ./*, ~/*, $HOME/*
# "Standalone" means the target ends at end-of-string, whitespace, or a shell
# separator (; & |). Deeper paths like `rm -rf node_modules`, `rm -rf /tmp/cache`,
# `rm -rf ./dist`, `rm -rf $HOME/Downloads` are intentionally NOT matched.
rm_danger_re='(^|[[:space:]]|;|&|\|)rm[[:space:]]+(-[^[:space:]=]+[[:space:]]+)*-([^[:space:]=]*[rR][^[:space:]=]*[fF]|[^[:space:]=]*[fF][^[:space:]=]*[rR])[^[:space:]=]*([[:space:]]+-[^[:space:]=]+)*[[:space:]]+(/|~|~/|[$]HOME|[$]HOME/|\.|\./|\.\.|\.\./|\*|/\*|\./\*|~/\*|[$]HOME/\*)([[:space:]]|$|;|&|\|)'
if [[ "$cmd" =~ $rm_danger_re ]]; then
  block "rm -rf of root/home/working-tree (target was /, ~, \$HOME, ., ./, .., ../, *, /*, ./*, ~/*, or \$HOME/*)"
fi

# `--force-with-lease` is allowed (rebasing a feature branch needs it); a bare force, or any force onto
# main/master, is not.
# Each `git push …` segment is checked on its own, so a commit message in the same command can't trip it.
while IFS= read -r push; do
  [[ "$push" =~ (--force|[[:space:]]-f([[:space:]]|$)) ]] || continue
  if [[ "$push" =~ (--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$)) ]]; then
    block "git push --force / -f (use --force-with-lease)"
  fi
  if [[ "$push" =~ [[:space:]:+](main|master)([[:space:]]|$) ]]; then
    block "force push to main/master"
  fi
done < <(printf '%s\n' "$cmd" | grep -oE 'git push[^;&|]*')

case "$cmd" in
  *"git reset --hard"*)                          block "git reset --hard (destructive)" ;;
  *"git clean -fdx"*)                          block "git clean -fd (destructive)" ;;
  *"git clean -fd"*)                           block "git clean -fd (destructive)" ;;
  *"db:push"*"--force"*)                         block "drizzle db:push --force (bypasses migration safety)" ;;
  *"DROP TABLE"*|*"DROP DATABASE"*|*"TRUNCATE"*) block "destructive SQL statement" ;;
  *"docker-compose down -v"*|*"docker compose down -v"*) block "docker-compose down -v (deletes volumes)" ;;
  *":(){ :|:& };:"*)                            block "fork bomb" ;;
  *"--no-verify"*)                              block "--no-verify (skips git hooks)" ;;
esac

exit 0
