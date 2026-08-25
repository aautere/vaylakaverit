#!/usr/bin/env bash

set -euo pipefail

if git diff --cached --name-only | grep -Eq '(^|/)\.env($|\.)'; then
  echo "Refusing to commit environment files." >&2
  exit 1
fi

if git diff --cached -- . ':!pnpm-lock.yaml' | grep -Eiq \
  '(api[_-]?key|secret|token|password)[[:space:]]*[:=][[:space:]]*[^[:space:]]{8,}'; then
  echo "Possible secret found in staged changes. Remove it or use an environment variable." >&2
  exit 1
fi
