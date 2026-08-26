#!/usr/bin/env bash

# Guard the agent working agreement.
#
# The user owns the product and does not read the code, so an answer full of file
# paths, role names, and command output is unusable to them. These rules exist
# because that kept happening, and a rule that can be silently dropped is not a
# rule, so the harness fails when the guidance goes missing.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
guide="$repo_root/AGENTS.md"
instructions="$repo_root/.github/copilot-instructions.md"
openspec_config="$repo_root/openspec/config.yaml"

[ -f "$guide" ] || {
  echo 'FAIL: AGENTS.md is missing'
  exit 1
}

[ -f "$instructions" ] || {
  echo 'FAIL: .github/copilot-instructions.md is missing'
  exit 1
}

# The guide wraps at the editorconfig column limit, so a required phrase can span
# two lines. Collapse whitespace before matching to keep the check about wording
# rather than where the line happens to break.
flatten() {
  tr '\n' ' ' <"$1" | tr -s '[:space:]' ' '
}

guide_text="$(flatten "$guide")"
instructions_text="$(flatten "$instructions")"
openspec_text="$(flatten "$openspec_config")"

require() {
  local haystack="$1"
  local description="$2"
  local phrase="$3"

  case "$haystack" in
  *"$phrase"*) ;;
  *)
    echo "FAIL: $description"
    echo "       expected to find: $phrase"
    exit 1
    ;;
  esac
}

require "$instructions_text" \
  'the Copilot instructions no longer point at AGENTS.md' \
  'AGENTS.md'

require "$guide_text" \
  'the guide no longer answers the user in their own language' \
  'Answer the user in the language they use'

require "$guide_text" \
  'the guide has no section about reporting results to the user' \
  'Reporting results to the user'

require "$guide_text" \
  'the guide does not require leading with the user-visible effect' \
  'Lead with the user-visible effect'

require "$guide_text" \
  'the guide does not require saying whether the application is safe to use' \
  'whether the application is safe to use now'

require "$guide_text" \
  'the guide does not require explaining a technical name in everyday words' \
  'introduce it with an everyday explanation'

require "$guide_text" \
  'the guide allows technical evidence in the main explanation' \
  'Do not put file paths, commands, environment variable names, role names, commit hashes, or command output in the main explanation.'

require "$guide_text" \
  'the guide does not separate technical evidence into its own section' \
  'Technical details'

require "$guide_text" \
  'the guide allows a list of changed files to stand in for a summary' \
  'Never present a list of changed files, tasks, or commits as the summary of the work.'

require "$guide_text" \
  'the guide allows claiming success without observing it' \
  'Do not claim something works because it was implemented, merged, or deployed.'

require "$guide_text" \
  'the guide does not require correcting an earlier wrong answer' \
  'correct it plainly'

# Naming the jargon keeps the rule concrete. Without examples it reads as advice
# and gets ignored.
for term in 'data plane' 'managed identity' 'role assignment' 'idempotent'; do
  require "$guide_text" \
    "the guide no longer names '$term' as jargon to translate" \
    "$term"
done

require "$openspec_text" \
  'the OpenSpec workflow does not ask for plain-language progress updates' \
  'Explain progress to the user in plain language'

echo 'Agent guide tests passed.'
