import { readRuntimeMode } from '../runtime-config.js';

export type PreviewStoreConfig = {
  kind: 'preview';
};

export type CosmosStoreConfig = {
  kind: 'cosmos';
  endpoint: string;
  databaseId: string;
  containerId: string;
};

export type RoundStoreConfig = PreviewStoreConfig | CosmosStoreConfig;

export function readRoundStoreConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RoundStoreConfig {
  const runtimeMode = readRuntimeMode(environment);
  const expectedStore = runtimeMode === 'local-preview' ? 'preview' : 'cosmos';

  if (environment.ROUND_STORE && environment.ROUND_STORE !== expectedStore) {
    throw new Error(`ROUND_STORE must be "${expectedStore}" when APP_RUNTIME is "${runtimeMode}".`);
  }

  if (expectedStore === 'preview') {
    return { kind: 'preview' };
  }

  const endpoint = requiredSetting(environment, 'COSMOS_ENDPOINT');
  const databaseId = requiredSetting(environment, 'COSMOS_DATABASE_ID');
  const containerId = requiredSetting(environment, 'COSMOS_CONTAINER_ID');
  validateCosmosEndpoint(endpoint);

  return { kind: 'cosmos', endpoint, databaseId, containerId };
}

function requiredSetting(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when ROUND_STORE is "cosmos".`);
  }

  return value;
}

function validateCosmosEndpoint(endpoint: string): void {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('COSMOS_ENDPOINT must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    throw new Error('COSMOS_ENDPOINT must be a valid HTTPS URL.');
  }
}
