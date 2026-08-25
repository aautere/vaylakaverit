targetScope = 'subscription'

@allowed([
  'development'
  'production'
])
param environmentName string

@description('Azure region for all regional resources.')
param location string = 'westeurope'

@description('A short resource-name prefix. Use lowercase letters and numbers only.')
param namePrefix string = 'vaylakaverit'

var resourceGroupName = 'rg-${namePrefix}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: {
    application: 'vaylakaverit'
    environment: environmentName
    managedBy: 'bicep'
  }
}

module application 'resources.bicep' = {
  name: 'vaylakaverit-${environmentName}'
  scope: resourceGroup
  params: {
    environmentName: environmentName
    location: location
    namePrefix: namePrefix
  }
}

output resourceGroupName string = resourceGroup.name
output staticWebAppName string = application.outputs.staticWebAppName
output functionAppName string = application.outputs.functionAppName
