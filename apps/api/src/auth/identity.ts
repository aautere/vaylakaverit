import type { HttpRequest } from '@azure/functions';
import { AppleSignInUnavailableError, type AppleTokenVerifier } from './apple.js';
import type { AuthConfig } from './config.js';
import { JwtSessionCodec, type Session } from './session.js';

const previewGuestIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

export class IdentityService {
  public constructor(
    private readonly config: AuthConfig,
    private readonly appleTokenVerifier: AppleTokenVerifier,
    private readonly sessionCodec = config.kind === 'apple'
      ? new JwtSessionCodec(config.sessionSecret)
      : undefined,
  ) {}

  public sessionFromRequest(request: HttpRequest): Session | undefined {
    if (this.config.kind === 'preview') {
      const guestId = request.headers.get('x-preview-guest-id') ?? 'local-guest';
      if (!previewGuestIdPattern.test(guestId)) {
        return undefined;
      }

      return {
        subject: `guest:${guestId}`,
        authentication: 'guest',
        expiresAt: new Date('2100-01-01T00:00:00.000Z'),
      };
    }

    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token ? this.sessionCodec?.verify(token) : undefined;
  }

  public async signInWithApple(identityToken: string): Promise<{ sessionToken: string }> {
    if (this.config.kind !== 'apple' || !this.sessionCodec) {
      throw new AppleSignInUnavailableError();
    }

    const identity = await this.appleTokenVerifier.verify(identityToken, this.config);
    return {
      sessionToken: this.sessionCodec.issue(
        `apple:${identity.subject}`,
        'apple',
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      ),
    };
  }
}
