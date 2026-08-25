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
case "$args" in
*'deployment sub show'*'outputs.functionAppName'*) echo 'fn-app' ;;
*'deployment sub show'*'outputs.storageAccountName'*) echo 'stg' ;;
*'deployment sub show'*'outputs.applicationInsightsName'*) echo 'insights' ;;
*'deployment sub show'*'outputs.functionAppUrl'*) echo 'https://fn-app.example.net' ;;
*'deployment sub show'*'outputs.staticWebsiteEndpoint'*) echo 'https://web.example.net/' ;;
*'functionapp function list'*) printf '%s\n' ${STUB_FUNCTIONS-health createRound} ;;
*'functionapp identity show'*) echo 'principal-id' ;;
*'storage account show'*) echo '/scope/storage' ;;
*'monitor app-insights component show'*) echo '/scope/insights' ;;
*'role assignment list'*'/scope/storage'*) printf '%s' "${STUB_STORAGE_ROLES-}" ;;
*'role assignment list'*'/scope/insights'*) printf '%s' "${STUB_INSIGHTS_ROLES-}" ;;
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
  'https://web.example.net/') echo "${STUB_INDEX_HTML-<script src=\"https://fn-app.example.net/assets/index.js\"></script>}" ;;
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
expect_failure 'a PWA built for the wrong origin' 'does not reference' env STUB_INDEX_HTML='<script src="/assets/index.js"></script>'
expect_failure 'a missing storage role' "missing 'Storage Blob Data Owner'" env STUB_STORAGE_ROLES=$'Storage Queue Data Contributor\n'
expect_failure 'missing telemetry access' "missing 'Monitoring Metrics Publisher'" env STUB_INSIGHTS_ROLES=''

echo 'Azure deployment verification tests passed.'
