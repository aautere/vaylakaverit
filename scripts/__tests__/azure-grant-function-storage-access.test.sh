#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script="$repo_root/scripts/azure-grant-function-storage-access.sh"

[ -x "$script" ] || {
  echo "FAIL: grant script is not executable"
  exit 1
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stub_bin="$tmp/bin"
mkdir -p "$stub_bin"

cat >"$stub_bin/az" <<'STUB'
#!/usr/bin/env bash
args="$*"
case "$args" in
*'functionapp identity show'*) echo 'principal-id' ;;
*'storage account show'*) echo '/scope/storage' ;;
*'monitor app-insights component show'*) echo '/scope/insights' ;;
*'role assignment create'*)
  echo "$args" >>"$AZ_CALL_LOG"
  ;;
*)
  echo "unexpected az call: $args" >&2
  exit 1
  ;;
esac
STUB

chmod +x "$stub_bin/az"
log="$tmp/az-calls.log"
: >"$log"

if PATH="$stub_bin:$PATH" AZ_CALL_LOG="$log" "$script" rg fn stg insights >/dev/null 2>&1; then
  echo 'FAIL: the script must reject an incomplete argument list'
  exit 1
fi

PATH="$stub_bin:$PATH" AZ_CALL_LOG="$log" \
  "$script" rg fn stg insights deploy-client-id >/dev/null

assert_granted() {
  local role="$1"
  local scope="$2"

  if ! grep -F -- "--role $role" "$log" | grep -qF -- "--scope $scope"; then
    echo "FAIL: '$role' was not granted on '$scope'"
    cat "$log"
    exit 1
  fi
}

assert_granted 'Storage Blob Data Owner' '/scope/storage'
assert_granted 'Storage Queue Data Contributor' '/scope/storage'
assert_granted 'Storage Table Data Contributor' '/scope/storage'
assert_granted 'Monitoring Metrics Publisher' '/scope/insights'
assert_granted 'Storage Blob Data Contributor' '/scope/storage'

if ! grep -qF -- '--assignee-object-id principal-id' "$log"; then
  echo 'FAIL: the Function App identity was not used for its own role assignments'
  cat "$log"
  exit 1
fi

if ! grep -qF -- '--assignee deploy-client-id' "$log"; then
  echo 'FAIL: the deployment identity was not granted static website upload access'
  cat "$log"
  exit 1
fi

echo 'Azure role assignment script tests passed.'
