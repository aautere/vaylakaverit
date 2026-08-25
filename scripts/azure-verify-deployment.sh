#!/usr/bin/env bash

# Verify a deployed Vaylakaverit environment end to end.
#
# Flex Consumption reports a successful deployment even when the Functions host
# cannot load the package, and Azure Storage Static Website returns 404 for
# every unknown path. Both failure modes look healthy from the deployment logs
# alone, so a deployment is only complete once these checks pass.
#
# Every check is read only. Run it after `deploy-api` and again after
# `deploy-web`.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <environment>" >&2
  exit 1
fi

environment="$1"
resource_group="rg-vaylakaverit"
failures=0

pass() {
  echo "ok   | $1"
}

fail() {
  echo "FAIL | $1" >&2
  failures=$((failures + 1))
}

deployment_output() {
  az deployment sub show \
    --name "vaylakaverit-$environment" \
    --query "properties.outputs.$1.value" \
    --output tsv \
    --only-show-errors
}

http_status() {
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$@"
}

http_body() {
  curl --silent --show-error "$@"
}

http_headers() {
  curl --silent --show-error --dump-header - --output /dev/null "$@"
}

function_app_name="$(deployment_output functionAppName)"
storage_account_name="$(deployment_output storageAccountName)"
application_insights_name="$(deployment_output applicationInsightsName)"
api_origin="$(deployment_output functionAppUrl)"
static_website_endpoint="$(deployment_output staticWebsiteEndpoint)"
web_origin="${static_website_endpoint%/}"

if [ -z "$function_app_name" ] || [ -z "$api_origin" ] || [ -z "$web_origin" ]; then
  echo "Could not read the infrastructure deployment outputs for '$environment'." >&2
  echo "Deploy the infrastructure before verifying the environment." >&2
  exit 1
fi

echo "environment          : $environment"
echo "function app         : $function_app_name"
echo "api origin           : $api_origin"
echo "pwa origin           : $web_origin"
echo

# The Functions host indexes zero functions when the deployment package cannot
# be loaded, for example when it still contains pnpm's symlinked node_modules.
indexed_functions="$(
  az functionapp function list \
    --resource-group "$resource_group" \
    --name "$function_app_name" \
    --query '[].name' \
    --output tsv \
    --only-show-errors |
    sed "s|^$function_app_name/||"
)"

if [ -z "$indexed_functions" ]; then
  fail "the Function App indexes no functions, so the deployed package did not load"
else
  pass "the Function App indexes $(echo "$indexed_functions" | wc -w | tr -d ' ') functions"
fi

if echo "$indexed_functions" | grep -qx 'health'; then
  pass "the health function is indexed"
else
  fail "the health function is not indexed"
fi

health_status="$(http_status "$api_origin/api/health")"
if [ "$health_status" = "200" ]; then
  pass "GET $api_origin/api/health returned 200"
else
  fail "GET $api_origin/api/health returned $health_status"
fi

if http_body "$api_origin/api/health" | grep -q '"status":"ok"'; then
  pass "the health endpoint reports status ok"
else
  fail "the health endpoint did not report status ok"
fi

# The Functions host answers OPTIONS preflight itself and never routes it to a
# function, so application code cannot authorise a preflight. Without platform
# CORS the browser blocks every request carrying a JSON body or a custom header.
preflight_headers="$(
  http_headers \
    --request OPTIONS \
    --header "Origin: $web_origin" \
    --header 'Access-Control-Request-Method: POST' \
    --header 'Access-Control-Request-Headers: content-type,x-preview-guest-id' \
    "$api_origin/api/preview/rounds"
)"

if echo "$preflight_headers" | grep -qi "^access-control-allow-origin: $web_origin"; then
  pass "the API allows preflighted requests from the PWA origin"
else
  fail "the API does not allow preflighted requests from the PWA origin"
fi

# The PWA and the API are separate origins. The static website must not be
# treated as an API host, which is what the original relative /api calls did.
web_status="$(http_status "$web_origin/")"
if [ "$web_status" = "200" ]; then
  pass "the PWA is served from $web_origin"
else
  fail "the PWA returned $web_status from $web_origin"
fi

storage_api_status="$(http_status "$web_origin/api/health")"
if [ "$storage_api_status" = "200" ]; then
  fail "the static website answered /api/health, so the PWA may target the wrong origin"
else
  pass "the static website does not serve the API, as expected"
fi

# Vite injects the API origin into the bundle, not into index.html, so the
# origin has to be checked in the script the document loads.
bundle_path="$(http_body "$web_origin/" | grep -oE '/assets/[^"]+\.js' | head -n 1 || true)"
if [ -z "$bundle_path" ]; then
  fail "the published PWA does not reference a built script bundle"
elif http_body "$web_origin$bundle_path" | grep -q "$api_origin"; then
  pass "the published PWA bundle is built against the Function App origin"
else
  fail "the published PWA bundle does not reference $api_origin"
fi
# Managed identity access is granted outside Bicep because the deployment
# identity intentionally holds Contributor, not User Access Administrator.
function_principal_id="$(
  az functionapp identity show \
    --resource-group "$resource_group" \
    --name "$function_app_name" \
    --query principalId \
    --output tsv \
    --only-show-errors
)"
storage_scope="$(
  az storage account show \
    --resource-group "$resource_group" \
    --name "$storage_account_name" \
    --query id \
    --output tsv \
    --only-show-errors
)"
application_insights_scope="$(
  az monitor app-insights component show \
    --resource-group "$resource_group" \
    --app "$application_insights_name" \
    --query id \
    --output tsv \
    --only-show-errors
)"

assigned_role() {
  az role assignment list \
    --assignee "$function_principal_id" \
    --scope "$1" \
    --query '[].roleDefinitionName' \
    --output tsv \
    --only-show-errors
}

storage_roles="$(assigned_role "$storage_scope")"
for role in 'Storage Blob Data Owner' 'Storage Queue Data Contributor' 'Storage Table Data Contributor'; do
  if echo "$storage_roles" | grep -qx "$role"; then
    pass "the Function App identity has '$role' on the Storage Account"
  else
    fail "the Function App identity is missing '$role' on the Storage Account"
  fi
done

# Application Insights has local authentication disabled. Without this role the
# host silently drops the telemetry that explains any startup failure.
if assigned_role "$application_insights_scope" | grep -qx 'Monitoring Metrics Publisher'; then
  pass "the Function App identity has 'Monitoring Metrics Publisher' on Application Insights"
else
  fail "the Function App identity is missing 'Monitoring Metrics Publisher' on Application Insights"
fi

echo
if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed. The '$environment' environment is not ready." >&2
  echo "Run scripts/azure-grant-function-storage-access.sh for missing role assignments." >&2
  exit 1
fi

echo "All checks passed. The '$environment' environment serves the PWA and the API."
