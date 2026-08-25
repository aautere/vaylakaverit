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

The federated identity needs contributor access scoped to the destination resource group or
subscription. Production deployments additionally require GitHub environment approval.

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
