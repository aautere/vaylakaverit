import { describe, expect, it } from 'vitest';
import { readAuthConfig } from './config.js';

describe('authentication configuration', () => {
  it('defaults to local preview guests without Apple settings', () => {
    expect(readAuthConfig({})).toEqual({ kind: 'guest' });
  });

  it('requires all Apple and session settings when Apple authentication is enabled', () => {
    expect(() => readAuthConfig({ APP_RUNTIME: 'production', AUTH_MODE: 'apple' })).toThrow(
      'APPLE_CLIENT_ID is required when AUTH_MODE is "apple".',
    );
    expect(() =>
      readAuthConfig({
        APP_RUNTIME: 'production',
        AUTH_MODE: 'apple',
        APPLE_CLIENT_ID: 'com.example.golf',
        APPLE_TEAM_ID: 'ABCDEFGHIJ',
        APPLE_KEY_ID: 'KLMNOPQRST',
        APPLE_PRIVATE_KEY: 'key-reference',
        SESSION_JWT_SECRET: 'too-short',
      }),
    ).toThrow('SESSION_JWT_SECRET must contain at least 32 characters.');
  });

  it('allows guest identity only in local preview and shared development', () => {
    expect(readAuthConfig({ APP_RUNTIME: 'shared-development', AUTH_MODE: 'guest' })).toEqual({
      kind: 'guest',
    });
    expect(() => readAuthConfig({ APP_RUNTIME: 'production', AUTH_MODE: 'guest' })).toThrow(
      'AUTH_MODE must be "apple" when APP_RUNTIME is "production".',
    );
  });

  it('accepts Apple settings supplied through runtime configuration', () => {
    expect(
      readAuthConfig({
        APP_RUNTIME: 'production',
        AUTH_MODE: 'apple',
        APPLE_CLIENT_ID: 'com.example.golf',
        APPLE_TEAM_ID: 'ABCDEFGHIJ',
        APPLE_KEY_ID: 'KLMNOPQRST',
        APPLE_PRIVATE_KEY:
          '@Microsoft.KeyVault(SecretUri=https://example.vault.azure.net/secrets/apple)',
        SESSION_JWT_SECRET: 'a-session-secret-with-at-least-32-characters',
      }),
    ).toMatchObject({
      kind: 'apple',
      clientId: 'com.example.golf',
      teamId: 'ABCDEFGHIJ',
      keyId: 'KLMNOPQRST',
    });
  });
});
