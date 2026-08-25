import { describe, expect, it } from 'vitest';
import { readLiveUpdateConfig } from './config.js';

describe('live update configuration', () => {
  it('uses local polling in preview without Azure settings', () => {
    expect(readLiveUpdateConfig({})).toEqual({ kind: 'poll' });
  });

  it('uses polling in shared development without Azure Web PubSub settings', () => {
    expect(readLiveUpdateConfig({ APP_RUNTIME: 'shared-development' })).toEqual({ kind: 'poll' });
  });

  it('requires Azure Web PubSub settings for production', () => {
    expect(() => readLiveUpdateConfig({ APP_RUNTIME: 'production' })).toThrow(
      'WEB_PUBSUB_ENDPOINT is required',
    );
    expect(() =>
      readLiveUpdateConfig({
        APP_RUNTIME: 'production',
        ROUND_UPDATE_TRANSPORT: 'web-pubsub',
        WEB_PUBSUB_ENDPOINT: 'http://example.webpubsub.azure.com',
        WEB_PUBSUB_HUB: 'rounds',
      }),
    ).toThrow('WEB_PUBSUB_ENDPOINT must be an Azure Web PubSub HTTPS URL.');
  });

  it('accepts a configured Azure Web PubSub hub', () => {
    expect(
      readLiveUpdateConfig({
        APP_RUNTIME: 'production',
        ROUND_UPDATE_TRANSPORT: 'web-pubsub',
        WEB_PUBSUB_ENDPOINT: 'https://vaylakaverit.webpubsub.azure.com',
        WEB_PUBSUB_HUB: 'rounds',
      }),
    ).toEqual({
      kind: 'web-pubsub',
      endpoint: 'https://vaylakaverit.webpubsub.azure.com',
      hub: 'rounds',
    });
  });

  it('prevents polling in production', () => {
    expect(() =>
      readLiveUpdateConfig({
        APP_RUNTIME: 'production',
        ROUND_UPDATE_TRANSPORT: 'poll',
      }),
    ).toThrow('ROUND_UPDATE_TRANSPORT must be "web-pubsub" when APP_RUNTIME is "production".');
  });
});
