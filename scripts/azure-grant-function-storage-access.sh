#!/usr/bin/env bash

# Assign the data-plane roles required by a Flex Consumption Function App that
# uses its system-assigned identity for AzureWebJobsStorage, Application Insights
# ingestion, and Cosmos DB round storage. This is separate from Bicep because the
# GitHub deployment identity intentionally has Contributor, not User Access
# Administrator or Owner.

set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "Usage: $0 <resource-group> <function-app-name> <storage-account-name> <cosmos-account-name> <application-insights-name> <github-actions-client-id>" >&2
  exit 1
fi

resource_group="$1"
function_app_name="$2"
storage_account_name="$3"
cosmos_account_name="$4"
application_insights_name="$5"
github_actions_client_id="$6"

function_principal_id="$(
  az functionapp identity show \
    --resource-group "$resource_group" \
    --name "$function_app_name" \
    --query principalId \
    --output tsv
)"
storage_scope="$(
  az storage account show \
    --resource-group "$resource_group" \
    --name "$storage_account_name" \
    --query id \
    --output tsv
)"
application_insights_scope="$(
  az monitor app-insights component show \
    --resource-group "$resource_group" \
    --app "$application_insights_name" \
    --query id \
    --output tsv
)"

if [ -z "$function_principal_id" ] || [ -z "$storage_scope" ]; then
  echo "Could not resolve the Function App identity or Storage Account scope." >&2
  exit 1
fi

if [ -z "$application_insights_scope" ]; then
  echo "Could not resolve the Application Insights scope." >&2
  exit 1
fi

for role in "Storage Blob Data Owner" "Storage Queue Data Contributor" "Storage Table Data Contributor"; do
  az role assignment create \
    --assignee-object-id "$function_principal_id" \
    --assignee-principal-type ServicePrincipal \
    --role "$role" \
    --scope "$storage_scope" \
    --only-show-errors
done

az role assignment create \
  --assignee-object-id "$function_principal_id" \
  --assignee-principal-type ServicePrincipal \
  --role "Monitoring Metrics Publisher" \
  --scope "$application_insights_scope" \
  --only-show-errors

az cosmosdb sql role assignment create \
  --account-name "$cosmos_account_name" \
  --resource-group "$resource_group" \
  --scope "/" \
  --principal-id "$function_principal_id" \
  --role-definition-id "00000000-0000-0000-0000-000000000002" \
  --only-show-errors

az role assignment create \
  --assignee "$github_actions_client_id" \
  --role "Storage Blob Data Contributor" \
  --scope "$storage_scope" \
  --only-show-errors
