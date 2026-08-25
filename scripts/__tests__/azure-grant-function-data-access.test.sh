#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script="$repo_root/scripts/azure-grant-function-data-access.sh"

[ -x "$script" ] || {
  echo "FAIL: data access grant script is not executable"
  exit 1
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stub_bin="$tmp/bin"
mkdir -p "$stub_bin"

# The stub mirrors what the real CLI returns:
# - `cosmosdb show` and `webpubsub show` return full ARM resource ids;
# - `cosmosdb sql role assignment list` returns nothing when the account has no
#   matching assignment, and the assignment GUID when it does;
# - `az cosmosdb show` exits 3 with a ResourceNotFound error for a missing
#   account rather than printing an empty string.
cat >"$stub_bin/az" <<'STUB'
#!/usr/bin/env bash
args="$*"
cosmos_id='/subscriptions/sub/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-acct'
case "$args" in
*'functionapp identity show'*) echo "${STUB_PRINCIPAL_ID-principal-id}" ;;
*'cosmosdb show'*)
  if [ -n "${STUB_COSMOS_MISSING-}" ]; then
    echo "ResourceNotFound: The Resource 'Microsoft.DocumentDB/databaseAccounts/cosmos-acct' was not found." >&2
    exit 3
  fi
  echo "$cosmos_id"
  ;;
*'webpubsub show'*)
  if [ -n "${STUB_WEB_PUBSUB_MISSING-}" ]; then
    echo "ResourceNotFound: The Resource 'Microsoft.SignalRService/WebPubSub/live' was not found." >&2
    exit 3
  fi
  echo '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.SignalRService/WebPubSub/live'
  ;;
*'cosmosdb sql role assignment list'*)
  echo "$args" >>"$AZ_CALL_LOG"
  if [ -n "${STUB_COSMOS_ASSIGNMENT-}" ]; then
    echo "$STUB_COSMOS_ASSIGNMENT"
  fi
  ;;
*'cosmosdb sql role assignment create'*)
  echo "$args" >>"$AZ_CALL_LOG"
  ;;
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

run_grant() {
  : >"$log"
  env PATH="$stub_bin:$PATH" AZ_CALL_LOG="$log" "$@" \
    "$script" rg fn cosmos-acct live 2>&1
}

expect_failure() {
  local description="$1"
  shift

  if run_grant "$@" >/dev/null 2>&1; then
    echo "FAIL: $description should have failed the grant script"
    exit 1
  fi
}

if PATH="$stub_bin:$PATH" AZ_CALL_LOG="$log" "$script" rg fn cosmos-acct >/dev/null 2>&1; then
  echo 'FAIL: the script must reject an incomplete argument list'
  exit 1
fi

run_grant env >/dev/null

assert_logged() {
  local description="$1"
  local pattern="$2"

  if ! grep -qF -- "$pattern" "$log"; then
    echo "FAIL: $description"
    cat "$log"
    exit 1
  fi
}

cosmos_create="$(grep -F 'cosmosdb sql role assignment create' "$log" || true)"
if [ -z "$cosmos_create" ]; then
  echo 'FAIL: the Cosmos DB data-plane assignment was not created'
  cat "$log"
  exit 1
fi

# Cosmos DB data-plane access is a sqlRoleAssignments resource. Granting an
# Azure role instead leaves the account inaccessible while looking correct.
case "$cosmos_create" in
*'--role-definition-id 00000000-0000-0000-0000-000000000002'*) ;;
*)
  echo 'FAIL: the Cosmos DB assignment does not use the built-in Data Contributor role definition'
  echo "$cosmos_create"
  exit 1
  ;;
esac

case "$cosmos_create" in
*'--principal-id principal-id'*) ;;
*)
  echo 'FAIL: the Cosmos DB assignment was not granted to the Function App identity'
  echo "$cosmos_create"
  exit 1
  ;;
esac

case "$cosmos_create" in
*'--account-name cosmos-acct'*'--scope /'*) ;;
*'--scope /'*'--account-name cosmos-acct'*) ;;
*)
  echo 'FAIL: the Cosmos DB assignment is not scoped to the whole account'
  echo "$cosmos_create"
  exit 1
  ;;
esac

if grep -E '^role assignment create' "$log" | grep -qi 'cosmos'; then
  echo 'FAIL: Cosmos DB data-plane access must not be granted as an Azure role assignment'
  cat "$log"
  exit 1
fi

assert_logged "'Web PubSub Service Owner' was not granted" '--role Web PubSub Service Owner'
assert_logged 'the Web PubSub grant is not scoped to the Web PubSub resource' \
  '--scope /subscriptions/sub/resourceGroups/rg/providers/Microsoft.SignalRService/WebPubSub/live'
assert_logged 'the Web PubSub grant does not target the Function App identity' \
  '--assignee-object-id principal-id'
assert_logged 'the Web PubSub grant does not declare the principal type' \
  '--assignee-principal-type ServicePrincipal'

# `az cosmosdb sql role assignment create` mints a new assignment id on every
# call, so an unconditional re-run accumulates duplicate assignments.
idempotent_output="$(run_grant env STUB_COSMOS_ASSIGNMENT='5056db31-ca78-4a42-97d6-e027c8902d05')"
if grep -qF 'cosmosdb sql role assignment create' "$log"; then
  echo 'FAIL: re-running the script created a duplicate Cosmos DB data-plane assignment'
  cat "$log"
  exit 1
fi

case "$idempotent_output" in
*'already assigned'*) ;;
*)
  echo 'FAIL: the script did not report the existing Cosmos DB assignment'
  echo "$idempotent_output"
  exit 1
  ;;
esac

# Web PubSub is granted through `az role assignment create`, which is already a
# no-op when the assignment exists, so it must still run on a repeat pass.
assert_logged 'the Web PubSub grant was skipped on a repeat run' '--role Web PubSub Service Owner'

expect_failure 'a Function App without a system-assigned identity' env STUB_PRINCIPAL_ID=''
expect_failure 'a missing Cosmos DB account' env STUB_COSMOS_MISSING=1
expect_failure 'a missing Web PubSub resource' env STUB_WEB_PUBSUB_MISSING=1

echo 'Azure data access grant script tests passed.'
