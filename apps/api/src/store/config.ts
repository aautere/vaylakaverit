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
  const kind = environment.ROUND_STORE ?? 'preview';

  if (kind === 'preview') {
    return { kind };
  }

  if (kind !== 'cosmos') {
    throw new Error('ROUND_STORE must be either "preview" or "cosmos".');
  }

  const endpoint = requiredSetting(environment, 'COSMOS_ENDPOINT');
  const databaseId = requiredSetting(environment, 'COSMOS_DATABASE_ID');
  const containerId = requiredSetting(environment, 'COSMOS_CONTAINER_ID');
  validateCosmosEndpoint(endpoint);

  return { kind, endpoint, databaseId, containerId };
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
