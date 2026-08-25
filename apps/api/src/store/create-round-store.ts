import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { previewRoundStore } from '../preview-store.js';
import { CosmosRoundStore } from './cosmos-round-store.js';
import { readRoundStoreConfig } from './config.js';
import type { RoundStore } from './round-store.js';

export function createRoundStore(config = readRoundStoreConfig()): RoundStore {
  if (config.kind === 'preview') {
    return previewRoundStore;
  }

  const client = new CosmosClient({
    endpoint: config.endpoint,
    aadCredentials: new DefaultAzureCredential(),
  });
  return new CosmosRoundStore(client.database(config.databaseId).container(config.containerId));
}
