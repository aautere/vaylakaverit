import { describe, expect, it } from 'vitest';
import { readLiveUpdateConfig } from './config.js';

describe('live update configuration', () => {
  it('uses local polling in preview without Azure settings', () => {
    expect(readLiveUpdateConfig({})).toEqual({ kind: 'preview' });
  });

  it('requires Azure Web PubSub settings for a Cosmos-backed deployment', () => {
    expect(() => readLiveUpdateConfig({ ROUND_STORE: 'cosmos' })).toThrow(
      'WEB_PUBSUB_ENDPOINT is required',
    );
    expect(() =>
      readLiveUpdateConfig({
        ROUND_UPDATE_TRANSPORT: 'web-pubsub',
        WEB_PUBSUB_ENDPOINT: 'http://example.webpubsub.azure.com',
        WEB_PUBSUB_HUB: 'rounds',
      }),
    ).toThrow('WEB_PUBSUB_ENDPOINT must be an Azure Web PubSub HTTPS URL.');
  });

  it('accepts a configured Azure Web PubSub hub', () => {
    expect(
      readLiveUpdateConfig({
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
});
