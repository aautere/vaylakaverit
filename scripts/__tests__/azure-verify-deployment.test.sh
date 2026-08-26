#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script="$repo_root/scripts/azure-verify-deployment.sh"

[ -x "$script" ] || {
  echo "FAIL: verification script is not executable"
  exit 1
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
stub_bin="$tmp/bin"
mkdir -p "$stub_bin"

cat >"$stub_bin/az" <<'STUB'
#!/usr/bin/env bash
args="$*"
cosmos_id='/subscriptions/sub/resourceGroups/rg-vaylakaverit/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-acct'
web_pubsub_id='/subscriptions/sub/resourceGroups/rg-vaylakaverit/providers/Microsoft.SignalRService/WebPubSub/live'

# The CLI prints nothing and still exits 0 when a query resolves to null.
emit() {
  if [ -n "$1" ]; then
    echo "$1"
  fi
}

case "$args" in
*'deployment sub show'*'outputs.functionAppName'*) echo 'fn-app' ;;
*'deployment sub show'*'outputs.storageAccountName'*) echo 'stg' ;;
*'deployment sub show'*'outputs.applicationInsightsName'*) echo 'insights' ;;
*'deployment sub show'*'outputs.cosmosAccountName'*)
  # An output that main.bicep does not declare reads as an empty string, and
  # the CLI still exits 0.
  emit "${STUB_COSMOS_ACCOUNT_NAME-cosmos-acct}"
  ;;
*'deployment sub show'*'outputs.webPubSubName'*) emit "${STUB_WEB_PUBSUB_NAME-live}" ;;
*'deployment sub show'*'outputs.functionAppUrl'*) echo 'https://fn-app.example.net' ;;
*'deployment sub show'*'outputs.staticWebsiteEndpoint'*) echo 'https://web.example.net/' ;;
*'functionapp function list'*)
  for fn in ${STUB_FUNCTIONS-health createRound}; do echo "fn-app/$fn"; done
  ;;
*'functionapp config appsettings list'*"name=='ROUND_STORE'"*)
  # An absent app setting yields no output at all, not an empty line.
  emit "${STUB_ROUND_STORE-preview}"
  ;;
*'functionapp config appsettings list'*"name=='ROUND_UPDATE_TRANSPORT'"*)
  emit "${STUB_ROUND_UPDATE_TRANSPORT-preview}"
  ;;
*'functionapp identity show'*) echo 'principal-id' ;;
*'storage account show'*) echo '/scope/storage' ;;
*'monitor app-insights component show'*) echo '/scope/insights' ;;
*'cosmosdb show'*) echo "$cosmos_id" ;;
*'webpubsub show'*) echo "$web_pubsub_id" ;;
*'cosmosdb sql role assignment list'*)
  # The data-plane list returns full role definition resource ids, not GUIDs.
  for role in ${STUB_COSMOS_DATA_ROLES-}; do
    echo "$cosmos_id/sqlRoleDefinitions/$role"
  done
  ;;
*'role assignment list'*'/scope/storage'*) printf '%s' "${STUB_STORAGE_ROLES-}" ;;
*'role assignment list'*'/scope/insights'*) printf '%s' "${STUB_INSIGHTS_ROLES-}" ;;
*'role assignment list'*"$web_pubsub_id"*) printf '%s' "${STUB_WEB_PUBSUB_ROLES-}" ;;
*)
  echo "unexpected az call: $args" >&2
  exit 1
  ;;
esac
STUB

cat >"$stub_bin/curl" <<'STUB'
#!/usr/bin/env bash
args="$*"
url="${*: -1}"
if [[ "$args" == *'--write-out'* ]]; then
  case "$url" in
  'https://fn-app.example.net/api/health') echo "${STUB_HEALTH_STATUS-200}" ;;
  'https://web.example.net/') echo "${STUB_WEB_STATUS-200}" ;;
  'https://web.example.net/api/health') echo "${STUB_STORAGE_API_STATUS-404}" ;;
  *) echo '000' ;;
  esac
elif [[ "$args" == *'--dump-header'* ]]; then
  echo 'HTTP/1.1 204 No Content'
  if [ "${STUB_CORS-on}" = 'on' ]; then
    echo 'access-control-allow-origin: https://web.example.net'
  fi
else
  case "$url" in
  'https://fn-app.example.net/api/health') echo "${STUB_HEALTH_BODY-\{\"status\":\"ok\"\}}" ;;
  'https://web.example.net/') echo "${STUB_INDEX_HTML-<script type=\"module\" src=\"/assets/index-abc123.js\"></script>}" ;;
  'https://web.example.net/assets/index-abc123.js') echo "${STUB_BUNDLE_JS-const o=\"https://fn-app.example.net\";}" ;;
  *) echo '' ;;
  esac
fi
STUB

chmod +x "$stub_bin/az" "$stub_bin/curl"

healthy_storage_roles=$'Storage Blob Data Owner\nStorage Queue Data Contributor\nStorage Table Data Contributor\n'
healthy_insights_roles=$'Monitoring Metrics Publisher\n'

run_verification() {
  env PATH="$stub_bin:$PATH" \
    STUB_STORAGE_ROLES="$healthy_storage_roles" \
    STUB_INSIGHTS_ROLES="$healthy_insights_roles" \
    "$@" \
    "$script" development 2>&1
}

expect_failure() {
  local description="$1"
  local expected="$2"
  shift 2

  local output
  if output="$(run_verification "$@")"; then
    echo "FAIL: $description should have failed the verification"
    exit 1
  fi

  case "$output" in
  *"$expected"*) ;;
  *)
    echo "FAIL: $description did not report '$expected'"
    echo "$output"
    exit 1
    ;;
  esac
}

if ! "$script" >/dev/null 2>&1; then
  :
else
  echo "FAIL: the script must reject a missing environment argument"
  exit 1
fi

healthy_output="$(run_verification env)"
case "$healthy_output" in
*'All checks passed'*) ;;
*)
  echo 'FAIL: a healthy environment did not pass verification'
  echo "$healthy_output"
  exit 1
  ;;
esac

expect_failure 'an unindexed package' 'indexes no functions' env STUB_FUNCTIONS=''
expect_failure 'a missing health function' 'health function is not indexed' env STUB_FUNCTIONS='createRound'
expect_failure 'an unhealthy API' 'returned 503' env STUB_HEALTH_STATUS='503'
expect_failure 'a blocked preflight' 'does not allow preflighted requests' env STUB_CORS='off'
expect_failure 'a static site answering the API' 'static website answered' env STUB_STORAGE_API_STATUS='200'
expect_failure 'a PWA bundle built for the wrong origin' 'bundle does not reference' env STUB_BUNDLE_JS='const o="/api";'
expect_failure 'a PWA with no built bundle' 'does not reference a built script bundle' env STUB_INDEX_HTML='<div id="root"></div>'
expect_failure 'a missing storage role' "missing 'Storage Blob Data Owner'" env STUB_STORAGE_ROLES=$'Storage Queue Data Contributor\n'
expect_failure 'missing telemetry access' "missing 'Monitoring Metrics Publisher'" env STUB_INSIGHTS_ROLES=''

# Development runs the preview store and the polling transport, so the Cosmos DB
# and Web PubSub grants are not required there and must not fail verification.
case "$healthy_output" in
*'Cosmos DB data-plane access is not required'*) ;;
*)
  echo 'FAIL: a preview environment should not require Cosmos DB data-plane access'
  echo "$healthy_output"
  exit 1
  ;;
esac

case "$healthy_output" in
*'Web PubSub access is not required'*) ;;
*)
  echo 'FAIL: a polling environment should not require Web PubSub access'
  echo "$healthy_output"
  exit 1
  ;;
esac

# An environment configured for Cosmos DB and Web PubSub must hold both grants.
cosmos_data_contributor='00000000-0000-0000-0000-000000000002'
backed_output="$(
  run_verification env \
    STUB_ROUND_STORE='cosmos' \
    STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' \
    STUB_COSMOS_DATA_ROLES="$cosmos_data_contributor" \
    STUB_WEB_PUBSUB_ROLES=$'Web PubSub Service Owner\n'
)"
case "$backed_output" in
*'All checks passed'*) ;;
*)
  echo 'FAIL: a fully granted Cosmos DB and Web PubSub environment did not pass verification'
  echo "$backed_output"
  exit 1
  ;;
esac

expect_failure 'a Cosmos-backed environment without data-plane access' \
  "missing 'Cosmos DB Built-in Data Contributor'" \
  env STUB_ROUND_STORE='cosmos' STUB_COSMOS_DATA_ROLES='' \
  STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' STUB_WEB_PUBSUB_ROLES=$'Web PubSub Service Owner\n'

# Read-only data-plane access cannot write rounds, so it must not satisfy the check.
expect_failure 'a Cosmos-backed environment with read-only data access' \
  "missing 'Cosmos DB Built-in Data Contributor'" \
  env STUB_ROUND_STORE='cosmos' STUB_COSMOS_DATA_ROLES='00000000-0000-0000-0000-000000000001' \
  STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' STUB_WEB_PUBSUB_ROLES=$'Web PubSub Service Owner\n'

expect_failure 'a Web PubSub environment without service access' \
  "missing 'Web PubSub Service Owner'" \
  env STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' STUB_WEB_PUBSUB_ROLES=''

expect_failure 'a Web PubSub environment with read-only service access' \
  "missing 'Web PubSub Service Owner'" \
  env STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' STUB_WEB_PUBSUB_ROLES=$'Web PubSub Service Reader\n'

# An environment deployed before the resource names were surfaced at
# subscription scope reads them as empty, which must name the missing output
# rather than fail inside the Azure CLI.
expect_failure 'a deployment that does not output the Cosmos DB account name' \
  'does not output cosmosAccountName' \
  env STUB_ROUND_STORE='cosmos' STUB_COSMOS_ACCOUNT_NAME=''

expect_failure 'a deployment that does not output the Web PubSub name' \
  'does not output webPubSubName' \
  env STUB_ROUND_UPDATE_TRANSPORT='web-pubsub' STUB_WEB_PUBSUB_NAME=''

# The script reads resource names from the subscription-scoped deployment. An
# output that only exists on the module is empty at that scope, which strands
# the script on a real environment.
main_template="$repo_root/infra/main.bicep"
while read -r output_name; do
  grep -qE "^output $output_name " "$main_template" || {
    echo "FAIL: the script reads '$output_name', which infra/main.bicep does not output"
    exit 1
  }
done < <(grep -oE 'deployment_output [a-zA-Z]+' "$script" | awk '{print $2}' | sort -u)

echo 'Azure deployment verification tests passed.'
