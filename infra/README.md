# Azure infrastructure

`main.bicep` deploys environments into the shared CAF-named resource group `rg-vaylakaverit` in
Sweden Central and defines:

- Azure Storage Static Website hosting for the PWA;
- Azure Functions Flex Consumption for the API;
- Azure Cosmos DB for NoSQL in serverless mode;
- Azure Web PubSub Free tier for up to 20 live participant connections;
- Key Vault, Application Insights, Log Analytics, and Functions backing storage.

## Runtime topology

The PWA and API use separate origins. Azure Storage Static Website serves only the PWA; it does
not proxy `/api` requests to Azure Functions. The `deploy-web` workflow builds the PWA with the
Function App's HTTPS origin in `VITE_API_ORIGIN`, while local Vite development continues to proxy
relative `/api` requests to `127.0.0.1:7071`. The Function App allows the static website origin
through its `WEB_ORIGIN` setting.

Because the PWA calls the API cross-origin, the Function App also declares the static website
origin in its platform CORS configuration. The Functions host answers `OPTIONS` preflight requests
itself and never routes them to a function, so a catch-all `OPTIONS` handler in application code
cannot authorise a preflight. Without the platform setting the host returns `204` with no
`Access-Control-Allow-Origin` header and the browser blocks every request that carries
`content-type: application/json`, `authorization`, or `x-preview-guest-id`.

Deploy the Function package with the `deploy-api` workflow before deploying the PWA with
`deploy-web`. Both workflows derive the active environment's resource names from the infrastructure
deployment outputs and use the GitHub environment's federated Azure identity; no API secrets are
embedded in the browser build.

Flex Consumption mounts the deployment package read only and does not resolve symlinks inside it.
The `deploy-api` workflow therefore builds the package with a hoisted `node_modules` tree instead of
pnpm's default symlinked store, and fails if unexpected symlinks remain. A symlinked package
deploys successfully but leaves the Node worker unable to resolve `@azure/functions`, so the host
starts and reports healthy while indexing zero functions.

Development uses the non-persistent preview store, guest identity, and polling transport so it
does not require Apple credentials or data-plane access to Cosmos DB and Web PubSub. Production
uses Cosmos DB, Apple authentication, and Web PubSub; configure its Apple settings through secure
runtime configuration before deployment.

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
  <storage-account-name> \
  <application-insights-name> \
  <github-actions-client-id>
```

Resolve the resource names from the infrastructure deployment outputs so the command does not
depend on the generated name suffix:

```bash
az deployment sub show \
  --name vaylakaverit-development \
  --query 'properties.outputs.{fn:functionAppName.value,stg:storageAccountName.value,ai:applicationInsightsName.value}'
```

The script assigns `Storage Blob Data Owner`, `Storage Queue Data Contributor`, and `Storage Table
Data Contributor` only to the created Function App identity on its backing Storage Account. It also
grants the GitHub deployment identity `Storage Blob Data Contributor`, which is required by the
`deploy-web` workflow to enable the static website and upload PWA files.

The script additionally grants the Function App identity `Monitoring Metrics Publisher` on the
Application Insights component. Application Insights has local authentication disabled, so without
this role the Functions host silently drops all telemetry, including the startup errors that
explain why a deployed package failed to index any functions.

An Azure RBAC administrator must also grant the Function App identity `Web PubSub Service Owner` on
the provisioned Web PubSub resource. The API uses its managed identity to issue participant-scoped
client tokens and publish `round:<round-id>` group events; it does not use a Web PubSub key or
connection string.

## Local validation

```bash
az bicep build --file infra/main.bicep
```

## Deployment order and verification

A deployment is not finished when a workflow reports success. Flex Consumption reports a successful
deployment even when the Functions host cannot load the package, and Azure Storage Static Website
returns `404` for every unknown path, so both failure modes look healthy in the deployment logs.
Run the environment through this order and verify it afterwards:

1. `deploy-infrastructure` for the environment.
2. `scripts/azure-grant-function-storage-access.sh`, once per environment, by an Azure RBAC
   administrator. Skip this on later deployments; the assignments are idempotent but the deployment
   identity cannot create them.
3. `deploy-api` for the environment.
4. `deploy-web` for the environment.
5. Verify the result:

```bash
az login
./scripts/azure-verify-deployment.sh development
```

`azure-verify-deployment.sh` is read only. It resolves every resource name from the deployment
outputs and then checks that the Functions host indexed the deployed package, that
`GET /api/health` answers, that the API allows preflighted requests from the PWA origin, that the
published PWA targets the Function App origin rather than a relative `/api` path on the static
website, and that the managed identity holds every role it needs. The script exits non-zero and
names the failing check when any of these regress.

`pnpm check` runs `scripts/__tests__/run-all.sh`, which exercises both Azure scripts against a
stubbed `az` so their argument handling and required role assignments stay covered without touching
a subscription.

## Provisioning

Provisioning creates billable Azure resources. After an explicit approval:

```bash
az login
az deployment sub create \
  --location swedencentral \
  --template-file infra/main.bicep \
  --parameters environmentName=development
```
