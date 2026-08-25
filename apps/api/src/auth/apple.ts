import type { AppleAuthConfig } from './config.js';

export type VerifiedAppleIdentity = {
  subject: string;
};

export interface AppleTokenVerifier {
  verify(identityToken: string, config: AppleAuthConfig): Promise<VerifiedAppleIdentity>;
}

export class AppleSignInUnavailableError extends Error {
  public constructor() {
    super('Sign in with Apple is not configured for this environment.');
  }
}

/**
 * This deliberately accepts no Apple token. A production verifier must validate Apple's signature,
 * issuer, audience, expiry, and subject before the API issues a session.
 */
export class UnavailableAppleTokenVerifier implements AppleTokenVerifier {
  public async verify(
    _identityToken: string,
    _config: AppleAuthConfig,
  ): Promise<VerifiedAppleIdentity> {
    throw new AppleSignInUnavailableError();
  }
}
