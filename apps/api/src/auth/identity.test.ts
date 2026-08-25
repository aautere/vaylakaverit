import { describe, expect, it } from 'vitest';
import { AppleSignInUnavailableError, UnavailableAppleTokenVerifier } from './apple.js';
import { readAuthConfig } from './config.js';
import { IdentityService } from './identity.js';

describe('Apple identity seam', () => {
  it('does not issue a session until a real Apple token verifier is supplied', async () => {
    const service = new IdentityService(
      readAuthConfig({
        AUTH_MODE: 'apple',
        APPLE_CLIENT_ID: 'com.example.golf',
        APPLE_TEAM_ID: 'ABCDEFGHIJ',
        APPLE_KEY_ID: 'KLMNOPQRST',
        APPLE_PRIVATE_KEY: 'key-reference',
        SESSION_JWT_SECRET: 'a-session-secret-with-at-least-32-characters',
      }),
      new UnavailableAppleTokenVerifier(),
    );

    await expect(service.signInWithApple('unverified-token')).rejects.toBeInstanceOf(
      AppleSignInUnavailableError,
    );
  });
});
