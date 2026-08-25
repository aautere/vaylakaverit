import { describe, expect, it } from 'vitest';
import { previewRoundStore } from '../preview-store.js';
import { readRoundStoreConfig } from './config.js';
import { createRoundStore } from './create-round-store.js';

describe('round store configuration', () => {
  it('uses the in-memory preview store by default', () => {
    expect(readRoundStoreConfig({})).toEqual({ kind: 'preview' });
    expect(createRoundStore({ kind: 'preview' })).toBe(previewRoundStore);
  });

  it('requires complete Cosmos settings when Cosmos is selected', () => {
    expect(() => readRoundStoreConfig({ APP_RUNTIME: 'shared-development' })).toThrow(
      'COSMOS_ENDPOINT is required',
    );
    expect(() =>
      readRoundStoreConfig({
        APP_RUNTIME: 'shared-development',
        ROUND_STORE: 'cosmos',
        COSMOS_ENDPOINT: 'http://not-secure.example',
        COSMOS_DATABASE_ID: 'vaylakaverit',
        COSMOS_CONTAINER_ID: 'rounds',
      }),
    ).toThrow('COSMOS_ENDPOINT must be a valid HTTPS URL.');
  });

  it('accepts managed-identity Cosmos configuration', () => {
    expect(
      readRoundStoreConfig({
        APP_RUNTIME: 'shared-development',
        ROUND_STORE: 'cosmos',
        COSMOS_ENDPOINT: 'https://vaylakaverit.documents.azure.com:443/',
        COSMOS_DATABASE_ID: 'vaylakaverit',
        COSMOS_CONTAINER_ID: 'rounds',
      }),
    ).toEqual({
      kind: 'cosmos',
      endpoint: 'https://vaylakaverit.documents.azure.com:443/',
      databaseId: 'vaylakaverit',
      containerId: 'rounds',
    });
  });

  it('prevents durable stores in local preview', () => {
    expect(() => readRoundStoreConfig({ ROUND_STORE: 'cosmos' })).toThrow(
      'ROUND_STORE must be "preview" when APP_RUNTIME is "local-preview".',
    );
  });
});
