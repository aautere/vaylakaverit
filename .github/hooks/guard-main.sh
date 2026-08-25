#!/usr/bin/env bash

set -euo pipefail

branch="$(git branch --show-current)"
if [ "$branch" = "main" ]; then
  echo "Direct commits and pushes to main are blocked. Work on a feature branch instead." >&2
  exit 1
fi
