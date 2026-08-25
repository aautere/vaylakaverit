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
Data Contributor` only to the created Function App identity on its backing Storage Account.

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
