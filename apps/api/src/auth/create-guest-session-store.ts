import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { readRoundStoreConfig } from '../store/config.js';
import {
  CosmosGuestSessionStore,
  PreviewGuestSessionStore,
  type GuestSessionStore,
} from './guest-session-store.js';

const previewGuestSessionStore = new PreviewGuestSessionStore();

export function createGuestSessionStore(config = readRoundStoreConfig()): GuestSessionStore {
  if (config.kind === 'preview') {
    return previewGuestSessionStore;
  }

  const client = new CosmosClient({
    endpoint: config.endpoint,
    aadCredentials: new DefaultAzureCredential(),
  });
  return new CosmosGuestSessionStore(
    client.database(config.databaseId).container(config.containerId),
  );
}
