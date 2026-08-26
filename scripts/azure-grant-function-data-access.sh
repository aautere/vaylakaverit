#!/usr/bin/env bash

# Grant the Function App's system-assigned identity the data-plane access it
# needs for the Cosmos DB round store and the Web PubSub live-update transport.
#
# Cosmos DB is provisioned with `disableLocalAuth: true` and Web PubSub with
# `disableAadAuth: false`, and the API authenticates to both with
# DefaultAzureCredential. Without these grants an environment that runs
# ROUND_STORE=cosmos or ROUND_UPDATE_TRANSPORT=web-pubsub deploys successfully
# and then fails at request time.
#
# This is separate from Bicep because the GitHub deployment identity
# intentionally has Contributor, not User Access Administrator or Owner. Run it
# as a developer with Azure RBAC administration permission.

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <resource-group> <function-app-name> <cosmos-account-name> <web-pubsub-name>" >&2
  exit 1
fi

resource_group="$1"
function_app_name="$2"
cosmos_account_name="$3"
web_pubsub_name="$4"

# Cosmos DB for NoSQL data-plane access is not Azure RBAC. It is a
# Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments child resource with
# its own built-in role definitions, so an Azure role such as Contributor or
# even Owner grants no access to documents at all.
cosmos_data_contributor_id='00000000-0000-0000-0000-000000000002'

function_principal_id="$(
  az functionapp identity show \
    --resource-group "$resource_group" \
    --name "$function_app_name" \
    --query principalId \
    --output tsv \
    --only-show-errors
)"
cosmos_scope="$(
  az cosmosdb show \
    --resource-group "$resource_group" \
    --name "$cosmos_account_name" \
    --query id \
    --output tsv \
    --only-show-errors
)"
web_pubsub_scope="$(
  az webpubsub show \
    --resource-group "$resource_group" \
    --name "$web_pubsub_name" \
    --query id \
    --output tsv \
    --only-show-errors
)"

if [ -z "$function_principal_id" ]; then
  echo "Could not resolve the Function App identity for '$function_app_name'." >&2
  exit 1
fi

if [ -z "$cosmos_scope" ]; then
  echo "Could not resolve the Cosmos DB account scope for '$cosmos_account_name'." >&2
  exit 1
fi

if [ -z "$web_pubsub_scope" ]; then
  echo "Could not resolve the Web PubSub scope for '$web_pubsub_name'." >&2
  exit 1
fi

# `az cosmosdb sql role assignment create` mints a fresh assignment id on every
# run and does not detect an equivalent existing assignment, so re-running it
# blindly accumulates duplicates instead of being a no-op.
existing_cosmos_assignment="$(
  az cosmosdb sql role assignment list \
    --account-name "$cosmos_account_name" \
    --resource-group "$resource_group" \
    --query "[?principalId=='$function_principal_id' && scope=='$cosmos_scope' && ends_with(roleDefinitionId, '/$cosmos_data_contributor_id')].name" \
    --output tsv \
    --only-show-errors
)"

if [ -n "$existing_cosmos_assignment" ]; then
  echo "skip | 'Cosmos DB Built-in Data Contributor' is already assigned on $cosmos_account_name"
else
  az cosmosdb sql role assignment create \
    --account-name "$cosmos_account_name" \
    --resource-group "$resource_group" \
    --role-definition-id "$cosmos_data_contributor_id" \
    --scope '/' \
    --principal-id "$function_principal_id" \
    --output none \
    --only-show-errors
  echo "done | granted 'Cosmos DB Built-in Data Contributor' on $cosmos_account_name"
fi

# The API both publishes to `round:<round-id>` groups and mints participant
# client access tokens. Web PubSub Service Reader is read only and cannot do
# either, so Service Owner is the least privileged built-in role that works.
# `az role assignment create` is a no-op when the assignment already exists.
az role assignment create \
  --assignee-object-id "$function_principal_id" \
  --assignee-principal-type ServicePrincipal \
  --role 'Web PubSub Service Owner' \
  --scope "$web_pubsub_scope" \
  --output none \
  --only-show-errors
echo "done | granted 'Web PubSub Service Owner' on $web_pubsub_name"
