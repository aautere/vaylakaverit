# Azure infrastructure

`main.bicep` deploys environments into the shared CAF-named resource group `rg-vaylakaverit` in
Sweden Central and defines:

- Azure Storage Static Website hosting for the PWA;
- Azure Functions Flex Consumption for the API;
- Azure Cosmos DB for NoSQL in serverless mode;
- Azure Web PubSub Free tier for up to 20 live participant connections;
- Key Vault, Application Insights, Log Analytics, and Functions backing storage.

## Cost guardrails

- The PWA is hosted by the Storage Static Website feature, with no separate Static Web Apps plan.
- Web PubSub uses Free_F1, limited to 20 concurrent participant connections and 20,000 messages
  per day.
- Functions Flex Consumption uses the smallest 512 MB instance size, no always-ready instances,
  and a maximum of five instances. It scales to zero while idle.
- Cosmos DB uses serverless capacity with zone redundancy disabled.
- Storage uses Standard locally redundant storage.
- Application Insights is capped at 0.1 GB of ingestion per day. When the cap is reached,
  telemetry collection stops until the next day.

An Azure Budget alert is an additional notification guardrail; it does not stop resource usage or
guarantee a hard spending limit.

## Deployment prerequisites

Do not run a deployment until the Azure subscription and GitHub environment variables have been
configured. The deployment workflow expects `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and
`AZURE_SUBSCRIPTION_ID` as GitHub environment variables for an Azure federated identity.

The federated identity needs Contributor access scoped to the destination resource group or
subscription. Production deployments additionally require GitHub environment approval.

The deployment identity intentionally does not receive permission to administer Azure RBAC. After
the Function App has been provisioned, a developer with Azure RBAC administration permission must
grant the Function App's managed identity the required Storage data-plane roles:

```bash
./scripts/azure-grant-function-storage-access.sh \
  <resource-group> \
  <function-app-name> \
  <storage-account-name>
```

The script assigns `Storage Blob Data Owner`, `Storage Queue Data Contributor`, and `Storage Table
Data Contributor` only to the created Function App identity on its backing Storage Account. It also
grants the GitHub deployment identity `Storage Blob Data Contributor`, which is required by the
`deploy-web` workflow to enable the static website and upload PWA files.

An Azure RBAC administrator must also grant the Function App identity `Web PubSub Service Owner` on
the provisioned Web PubSub resource. The API uses its managed identity to issue participant-scoped
client tokens and publish `round:<round-id>` group events; it does not use a Web PubSub key or
connection string.

## Apple Sign In and guest-session preparation

Apple Sign In is intentionally not enabled in a deployed environment yet. The API's current Apple
token verifier rejects every token, and it has no Apple redirect callback. Do not register an
invented return URL, set `AUTH_MODE=apple`, or describe the `/auth/apple` endpoint as working Apple
login until a production verifier and browser sign-in flow have been implemented and reviewed.

The Function App uses a system-assigned managed identity. Once the Apple flow is implemented, an
Azure RBAC administrator must grant that identity `Key Vault Secrets User` on the environment's
Key Vault before configuring the Function App's Key Vault references:

```bash
environment=development
deployment_name="vaylakaverit-${environment}"
resource_group="rg-vaylakaverit"
function_app_name="$(az deployment sub show \
  --name "$deployment_name" \
  --query properties.outputs.functionAppName.value \
  --output tsv)"
key_vault_name="$(az deployment sub show \
  --name "$deployment_name" \
  --query properties.outputs.keyVaultName.value \
  --output tsv)"
function_principal_id="$(az functionapp identity show \
  --resource-group "$resource_group" \
  --name "$function_app_name" \
  --query principalId \
  --output tsv)"
key_vault_id="$(az keyvault show \
  --name "$key_vault_name" \
  --query id \
  --output tsv)"

az role assignment create \
  --assignee-object-id "$function_principal_id" \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "$key_vault_id"
```

The operator must create these versionless Key Vault secret names without placing their values in
GitHub, Bicep parameters, or the repository:

| Secret name          | Required value                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apple-private-key`  | The complete private `.p8` key generated for the Apple Sign In key, including line breaks.                                                     |
| `session-jwt-secret` | A newly generated random secret of at least 32 characters; use at least 32 random bytes and retain it while issued sessions must remain valid. |

The future Apple configuration needs the following non-secret Function App settings and Key Vault
references. `APPLE_CLIENT_ID` is the Apple Service ID, while `APPLE_TEAM_ID` and `APPLE_KEY_ID`
are the associated ten-character Apple identifiers. The Key Vault URLs are intentionally
versionless so normal secret rotation can take effect after the Function App refreshes its
references.

```bash
az functionapp config appsettings set \
  --resource-group "$resource_group" \
  --name "$function_app_name" \
  --settings \
    AUTH_MODE=apple \
    APPLE_CLIENT_ID='<Apple Service ID>' \
    APPLE_TEAM_ID='<Apple Team ID>' \
    APPLE_KEY_ID='<Apple key ID>' \
    "APPLE_PRIVATE_KEY=@Microsoft.KeyVault(SecretUri=https://${key_vault_name}.vault.azure.net/secrets/apple-private-key/)" \
    "SESSION_JWT_SECRET=@Microsoft.KeyVault(SecretUri=https://${key_vault_name}.vault.azure.net/secrets/session-jwt-secret/)"
```

Apple Developer Portal work remains blocked until an approved browser callback flow exists. At that
point, create or select the Apple Service ID whose identifier becomes `APPLE_CLIENT_ID`, associate
it with the deployed PWA host, and register only the HTTPS return URL handled by that new callback
route. The current JSON-only `POST /api/auth/apple` route is not a return URL and must not be
entered in Apple Developer Portal.

Production device-bound guest sessions are also not configured yet. Preview guests use a
browser-local identifier only in preview mode; the deployed API accepts no guest-session issuance
path. A production implementation must issue and verify a signed, device-local guest credential
using `session-jwt-secret`, collect the guest display name during create or join, and retain the
existing round-participant and own-score authorization checks. It must not accept
`x-preview-guest-id` outside preview mode.

## Local validation

```bash
az bicep build --file infra/main.bicep
```

## Provisioning

Provisioning creates billable Azure resources. After an explicit approval:

```bash
az login
az deployment sub create \
  --location swedencentral \
  --template-file infra/main.bicep \
  --parameters environmentName=development
```
