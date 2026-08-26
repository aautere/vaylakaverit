#!/usr/bin/env bash

set -euo pipefail

tests_dir="$(cd "$(dirname "$0")" && pwd)"

"$tests_dir/agents-guide.test.sh"
"$tests_dir/openspec-new-change.test.sh"
"$tests_dir/azure-grant-function-storage-access.test.sh"
"$tests_dir/azure-grant-function-data-access.test.sh"
"$tests_dir/azure-verify-deployment.test.sh"
