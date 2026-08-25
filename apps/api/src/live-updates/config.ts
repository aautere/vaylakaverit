export type PreviewLiveUpdateConfig = {
  kind: 'preview';
};

export type WebPubSubLiveUpdateConfig = {
  kind: 'web-pubsub';
  endpoint: string;
  hub: string;
};

export type LiveUpdateConfig = PreviewLiveUpdateConfig | WebPubSubLiveUpdateConfig;

export function readLiveUpdateConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LiveUpdateConfig {
  const kind = environment.ROUND_UPDATE_TRANSPORT ?? defaultTransport(environment);

  if (kind === 'preview') {
    if (environment.ROUND_STORE === 'cosmos') {
      throw new Error(
        'ROUND_UPDATE_TRANSPORT "preview" is only available with ROUND_STORE "preview".',
      );
    }

    return { kind };
  }

  if (kind !== 'web-pubsub') {
    throw new Error('ROUND_UPDATE_TRANSPORT must be either "preview" or "web-pubsub".');
  }

  const endpoint = requiredSetting(environment, 'WEB_PUBSUB_ENDPOINT');
  const hub = requiredSetting(environment, 'WEB_PUBSUB_HUB');
  validateWebPubSubEndpoint(endpoint);

  return { kind, endpoint, hub };
}

function defaultTransport(environment: NodeJS.ProcessEnv): 'preview' | 'web-pubsub' {
  return environment.ROUND_STORE === 'cosmos' ? 'web-pubsub' : 'preview';
}

function requiredSetting(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when ROUND_UPDATE_TRANSPORT is "web-pubsub".`);
  }

  return value;
}

function validateWebPubSubEndpoint(endpoint: string): void {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('WEB_PUBSUB_ENDPOINT must be a valid HTTPS URL.');
  }

  if (url.protocol !== 'https:' || !url.hostname.endsWith('.webpubsub.azure.com')) {
    throw new Error('WEB_PUBSUB_ENDPOINT must be an Azure Web PubSub HTTPS URL.');
  }
}
