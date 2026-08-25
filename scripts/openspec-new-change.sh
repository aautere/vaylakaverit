#!/usr/bin/env bash

# Create an OpenSpec change and ensure the proposal artifact is usable. This wrapper
# protects against OpenSpec CLI failures that may otherwise leave an incomplete change.

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: pnpm spec:new <change-name>" >&2
  exit 1
fi

change_name="$1"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
change_dir="$repo_root/openspec/changes/$change_name"
template_file="$repo_root/templates/openspec/proposal.md"

if ! [[ "$change_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Change names must be lowercase kebab-case." >&2
  exit 1
fi

if [ ! -f "$template_file" ]; then
  echo "Proposal template is missing: $template_file" >&2
  exit 1
fi

cd "$repo_root"

stderr_file="$(mktemp)"
stdout_file="$(mktemp)"
trap 'rm -f "$stderr_file" "$stdout_file"' EXIT

if [ -x "$repo_root/node_modules/.bin/openspec" ]; then
  openspec_cmd=(pnpm exec openspec)
elif command -v openspec >/dev/null 2>&1; then
  openspec_cmd=(openspec)
else
  echo "OpenSpec is not installed. Run pnpm install and try again." >&2
  exit 1
fi

set +e
"${openspec_cmd[@]}" new change "$change_name" >"$stdout_file" 2>"$stderr_file"
cli_exit=$?
set -e

[ -s "$stdout_file" ] && cat "$stdout_file"
[ -s "$stderr_file" ] && cat "$stderr_file" >&2

if grep -qE 'Failed to parse|YAMLParseError|YAML.*parse|ENOENT' "$stderr_file"; then
  echo "OpenSpec could not read its configuration. Fix openspec/config.yaml and try again." >&2
  exit 1
fi

if [ "$cli_exit" -ne 0 ] && ! { grep -q "already exists" "$stderr_file" && [ -d "$change_dir" ]; }; then
  exit "$cli_exit"
fi

if [ ! -d "$change_dir" ]; then
  echo "OpenSpec did not create the expected directory: $change_dir" >&2
  exit 1
fi

proposal="$change_dir/proposal.md"
if [ ! -f "$proposal" ]; then
  sed -e "s/{{CHANGE_NAME}}/$change_name/g" "$template_file" >"$proposal"
fi

if ! grep -qE '^status:[[:space:]]+draft[[:space:]]*$|^status:[[:space:]]+approved[[:space:]]*$' \
  "$proposal"; then
  echo "Proposal is missing a valid status field: $proposal" >&2
  exit 1
fi

printf '\nOpenSpec change ready: %s\n' "$proposal"
echo "Complete and review the draft proposal before continuing to specs, design, and tasks."
