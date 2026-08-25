# Azure infrastructure

`main.bicep` creates one resource group per environment and defines:

- Azure Static Web Apps for the PWA;
- Azure Functions Flex Consumption for the API;
- Azure Cosmos DB for NoSQL in serverless mode;
- Azure Web PubSub Free tier for up to 20 live participant connections;
- Key Vault, Application Insights, Log Analytics, and Functions backing storage.

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
  --location westeurope \
  --template-file infra/main.bicep \
  --parameters environmentName=development
```
