param environmentName string
param location string
param namePrefix string

var suffix = toLower(take(uniqueString(subscription().id, resourceGroup().id, environmentName), 6))
var compactPrefix = replace(namePrefix, '-', '')
var storageName = take('${compactPrefix}${environmentName}${suffix}', 24)
var functionAppName = '${namePrefix}-${environmentName}-api-${suffix}'
var cosmosAccountName = '${namePrefix}-${environmentName}-cosmos-${suffix}'
var webPubSubName = '${namePrefix}-${environmentName}-live-${suffix}'
var keyVaultName = 'kv-${namePrefix}-${suffix}2'
var logAnalyticsName = '${namePrefix}-${environmentName}-logs-${suffix}'
var applicationInsightsName = '${namePrefix}-${environmentName}-insights-${suffix}'
var deploymentContainerName = 'function-package'
var isProduction = environmentName == 'production'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: deploymentContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    DisableLocalAuth: true
    WorkspaceResourceId: logAnalytics.id
  }
}

resource applicationInsightsBilling 'Microsoft.Insights/components/currentbillingfeatures@2015-05-01' = {
  parent: applicationInsights
  name: 'CurrentBillingFeatures'
  properties: {
    dataVolumeCap: {
      cap: json('0.1')
      stopSendNotificationWhenHitCap: true
      stopSendNotificationWhenHitThreshold: true
    }
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${namePrefix}-${environmentName}-flex-${suffix}'
  location: location
  kind: 'linux'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    httpsOnly: true
    serverFarmId: functionPlan.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      runtime: {
        name: 'node'
        version: '22'
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 5
        instanceMemoryMB: 512
      }
    }
    siteConfig: {
      alwaysOn: false
      minTlsVersion: '1.2'
    }
  }
}

var storageBlobDataOwnerRoleId = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
var storageQueueDataContributorRoleId = '974c5e8b-45b9-4653-ba55-5f855dd0fb88'
var storageTableDataContributorRoleId = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var monitoringMetricsPublisherRoleId = '3913510d-42f4-4e42-8a64-420c390055eb'

resource functionAppStorageBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, functionApp.id, storageBlobDataOwnerRoleId)
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageBlobDataOwnerRoleId
    )
  }
}

resource functionAppStorageQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, functionApp.id, storageQueueDataContributorRoleId)
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageQueueDataContributorRoleId
    )
  }
}

resource functionAppStorageTableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storageAccount
  name: guid(storageAccount.id, functionApp.id, storageTableDataContributorRoleId)
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageTableDataContributorRoleId
    )
  }
}

resource functionAppMetricsPublisherRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: applicationInsights
  name: guid(applicationInsights.id, functionApp.id, monitoringMetricsPublisherRoleId)
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      monitoringMetricsPublisherRoleId
    )
  }
}

resource functionAppSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: functionApp
  name: 'appsettings'
  properties: {
    AzureWebJobsStorage__credential: 'managedidentity'
    AzureWebJobsStorage__accountName: storageAccount.name
    AzureWebJobsStorage__blobServiceUri: storageAccount.properties.primaryEndpoints.blob
    AzureWebJobsStorage__queueServiceUri: storageAccount.properties.primaryEndpoints.queue
    AzureWebJobsStorage__tableServiceUri: storageAccount.properties.primaryEndpoints.table
    APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsights.properties.ConnectionString
    APPLICATIONINSIGHTS_AUTHENTICATION_STRING: 'Authorization=AAD'
    AUTH_MODE: isProduction ? 'apple' : 'preview'
    ROUND_STORE: isProduction ? 'cosmos' : 'preview'
    COSMOS_ENDPOINT: cosmosAccount.properties.documentEndpoint
    COSMOS_DATABASE_ID: cosmosDatabase.name
    COSMOS_CONTAINER_ID: roundsContainer.name
    ROUND_UPDATE_TRANSPORT: isProduction ? 'web-pubsub' : 'preview'
    WEB_PUBSUB_ENDPOINT: 'https://${webPubSub.name}.webpubsub.azure.com'
    WEB_PUBSUB_HUB: 'rounds'
    WEB_ORIGIN: join(take(split(storageAccount.properties.primaryEndpoints.web, '/'), 3), '/')
  }
}

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'vaylakaverit'
  properties: {
    resource: {
      id: 'vaylakaverit'
    }
  }
}

resource roundsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'rounds'
  properties: {
    resource: {
      id: 'rounds'
      partitionKey: {
        paths: [
          '/roundId'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource webPubSub 'Microsoft.SignalRService/webPubSub@2021-10-01' = {
  name: webPubSubName
  location: location
  sku: {
    name: 'Free_F1'
    tier: 'Free'
    capacity: 1
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    disableAadAuth: false
    disableLocalAuth: false
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enableRbacAuthorization: true
    enableSoftDelete: true
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output cosmosAccountName string = cosmosAccount.name
output webPubSubName string = webPubSub.name
output keyVaultName string = keyVault.name
output storageAccountName string = storageAccount.name
output staticWebsiteEndpoint string = storageAccount.properties.primaryEndpoints.web
