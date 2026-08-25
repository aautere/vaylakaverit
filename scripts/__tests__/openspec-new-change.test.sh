#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
wrapper="$repo_root/scripts/openspec-new-change.sh"
template="$repo_root/templates/openspec/proposal.md"
config="$repo_root/openspec/config.yaml"

[ -x "$wrapper" ] || { echo "FAIL: wrapper is not executable"; exit 1; }
[ -f "$template" ] || { echo "FAIL: proposal template is missing"; exit 1; }
[ -f "$config" ] || { echo "FAIL: OpenSpec config is missing"; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/scripts" "$tmp/templates/openspec" "$tmp/openspec"
cp "$wrapper" "$tmp/scripts/openspec-new-change.sh"
cp "$template" "$tmp/templates/openspec/proposal.md"
cp "$config" "$tmp/openspec/config.yaml"

PATH="$repo_root/node_modules/.bin:$PATH" "$tmp/scripts/openspec-new-change.sh" test-change >/dev/null
proposal="$tmp/openspec/changes/test-change/proposal.md"

[ -f "$proposal" ] || { echo "FAIL: proposal was not created"; exit 1; }
grep -qE '^status:[[:space:]]+draft[[:space:]]*$' "$proposal" ||
  { echo "FAIL: proposal does not start as a draft"; exit 1; }

echo "OpenSpec change wrapper tests passed."
