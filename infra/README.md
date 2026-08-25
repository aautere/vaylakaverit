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

Local preview uses an in-memory store, guest identity, and polling without Azure resources.
Published development uses Cosmos DB, device-local pseudonymous guest identities, and polling so
testers can create and join the same round from separate devices. Production uses Cosmos DB, Apple
authentication, and Web PubSub; configure its Apple settings through secure runtime configuration
before deployment.

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
  <cosmos-account-name> \
  <application-insights-name> \
  <github-actions-client-id>
```

Resolve the resource names from the infrastructure deployment outputs so the command does not
depend on the generated name suffix:

```bash
az deployment sub show \
  --name vaylakaverit-development \
  --query 'properties.outputs.{fn:functionAppName.value,stg:storageAccountName.value,ai:applicationInsightsName.value,cosmos:cosmosAccountName.value,live:webPubSubName.value}'
```

The script assigns `Storage Blob Data Owner`, `Storage Queue Data Contributor`, and `Storage Table
Data Contributor` only to the created Function App identity on its backing Storage Account. It also
assigns the built-in Cosmos DB Data Contributor role to that identity, allowing both published
development and production APIs to persist rounds. The script grants the GitHub deployment identity
`Storage Blob Data Contributor`, which is required by the `deploy-web` workflow to enable the static
website and upload PWA files.

The script additionally grants the Function App identity `Monitoring Metrics Publisher` on the
Application Insights component. Application Insights has local authentication disabled, so without
this role the Functions host silently drops all telemetry, including the startup errors that
explain why a deployed package failed to index any functions.

### Cosmos DB and Web PubSub data-plane access

An environment that runs `ROUND_STORE=cosmos` or `ROUND_UPDATE_TRANSPORT=web-pubsub` needs a second
set of grants. Cosmos DB is provisioned with `disableLocalAuth: true` and Web PubSub with
`disableAadAuth: false`, and the API authenticates to both with `DefaultAzureCredential`, so an
environment without these grants deploys successfully and then fails on the first request that
touches a round:

```bash
./scripts/azure-grant-function-data-access.sh \
  <resource-group> \
  <function-app-name> \
  <cosmos-account-name> \
  <web-pubsub-name>
```

The script grants the Function App identity:

- `Cosmos DB Built-in Data Contributor`, scoped to the whole Cosmos DB account. Cosmos DB for NoSQL
  data-plane access is not Azure RBAC. It is a
  `Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments` child resource with its own built-in
  role definitions, so an Azure role such as Contributor or even Owner grants no access to documents.
  `Cosmos DB Built-in Data Reader` is insufficient because the API writes rounds.
- `Web PubSub Service Owner` on the Web PubSub resource. The API both publishes to
  `round:<round-id>` groups and mints participant client access tokens. Web PubSub only offers
  `Web PubSub Service Owner` and the read-only `Web PubSub Service Reader` as data-plane roles, and
  the reader role can do neither, so Service Owner is the least privileged built-in role that works.

Both grants are safe to re-run. `az role assignment create` is already a no-op when the assignment
exists, but `az cosmosdb sql role assignment create` mints a fresh assignment id on every call and
does not detect an equivalent existing assignment, so the script checks for the Cosmos assignment
before creating it rather than accumulating duplicates.

Development runs the preview store and the polling transport, so it does not need these grants.
Run the script before switching an environment to Cosmos DB or Web PubSub, and before the first
production deployment.

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
3. `scripts/azure-grant-function-data-access.sh`, by the same administrator, for any environment
   that runs `ROUND_STORE=cosmos` or `ROUND_UPDATE_TRANSPORT=web-pubsub`. Development does not need
   it; production does.
4. `deploy-api` for the environment.
5. `deploy-web` for the environment.
6. Verify the result:

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

The Cosmos DB and Web PubSub grants are only required by the environments that use those back ends,
so the script reads the Function App's `ROUND_STORE` and `ROUND_UPDATE_TRANSPORT` settings and
verifies each grant only when the environment is configured to depend on it.

`pnpm check` runs `scripts/__tests__/run-all.sh`, which exercises all three Azure scripts against a
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
