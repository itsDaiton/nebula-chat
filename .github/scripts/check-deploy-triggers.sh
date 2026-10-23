#!/usr/bin/env bash
# Fails when a deploy-<app>.yml misses the release tag of a workspace lib the app is built from
# (transitively). Needs jq and mikefarah yq v4, both on the runner image; run from the repo root.
set -euo pipefail

config=release-please-config.json

# Package name -> directory, for every workspace package.
names_to_dirs=$(
  for manifest in apps/*/package.json libs/*/package.json openapi/package.json; do
    jq -c --arg dir "$(dirname "$manifest")" '{(.name): $dir}' "$manifest"
  done | jq -s 'add'
)

# Prints the directories of the workspace packages <dir> depends on.
workspace_deps() {
  jq -r --argjson dirs "$names_to_dirs" '
    [.dependencies, .devDependencies, .peerDependencies]
    | map(select(. != null) | to_entries[]) | .[]
    | select(.value | startswith("workspace:"))
    | $dirs[.key] // error("\(.key) is not a workspace package")
  ' "$1/package.json"
}

status=0
checked=0

for workflow in .github/workflows/deploy-*.yml; do
  app=$(basename "$workflow" .yml)
  app=${app#deploy-}
  [ -f "apps/$app/package.json" ] || continue
  checked=$((checked + 1))

  # Wrapped and flattened so a single-string `tags:` is an array, not a substring match.
  tags=$(yq -o=json '[.on.push.tags // []] | flatten' "$workflow")

  # Breadth-first walk; deps go through a variable so a jq failure stops the script under `set -e`.
  seen=()
  queue=()
  deps=$(workspace_deps "apps/$app")
  [ -z "$deps" ] || mapfile -t queue <<<"$deps"
  while [ "${#queue[@]}" -gt 0 ]; do
    dir=${queue[0]}
    queue=("${queue[@]:1}")
    case " ${seen[*]} " in *" $dir "*) continue ;; esac
    seen+=("$dir")
    deps=$(workspace_deps "$dir")
    [ -z "$deps" ] || mapfile -t -O "${#queue[@]}" queue <<<"$deps"
  done

  missing=()
  for dir in "${seen[@]}"; do
    component=$(jq -r --arg dir "$dir" '.packages[$dir].component // empty' "$config")
    if [ -z "$component" ]; then
      echo "::error file=$config::$dir has no release-please component, so apps/$app cannot key a deploy to its releases"
      status=1
      continue
    fi
    if ! jq -e --arg tag "$component-v*" 'index($tag) != null' <<<"$tags" >/dev/null; then
      missing+=("$component-v* ($dir)")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    for tag in "${missing[@]}"; do
      echo "::error file=$workflow::apps/$app is built from $tag, but its release tag does not trigger $workflow"
    done
    status=1
  else
    echo "ok: $workflow covers every workspace library apps/$app is built from (${seen[*]:-none})"
  fi
done

if [ "$checked" -eq 0 ]; then
  echo "::error::no deploy-<app>.yml matched an apps/<app> — the check found nothing to check"
  exit 1
fi

exit "$status"
