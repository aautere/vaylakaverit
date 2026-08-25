import { readRuntimeMode } from '../runtime-config.js';

export type PollingLiveUpdateConfig = {
  kind: 'poll';
};

export type WebPubSubLiveUpdateConfig = {
  kind: 'web-pubsub';
  endpoint: string;
  hub: string;
};

export type LiveUpdateConfig = PollingLiveUpdateConfig | WebPubSubLiveUpdateConfig;

export function readLiveUpdateConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LiveUpdateConfig {
  const runtimeMode = readRuntimeMode(environment);
  const expectedTransport = runtimeMode === 'production' ? 'web-pubsub' : 'poll';

  if (
    environment.ROUND_UPDATE_TRANSPORT &&
    environment.ROUND_UPDATE_TRANSPORT !== expectedTransport
  ) {
    throw new Error(
      `ROUND_UPDATE_TRANSPORT must be "${expectedTransport}" when APP_RUNTIME is "${runtimeMode}".`,
    );
  }

  if (expectedTransport === 'poll') {
    return { kind: 'poll' };
  }

  const endpoint = requiredSetting(environment, 'WEB_PUBSUB_ENDPOINT');
  const hub = requiredSetting(environment, 'WEB_PUBSUB_HUB');
  validateWebPubSubEndpoint(endpoint);

  return { kind: 'web-pubsub', endpoint, hub };
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
