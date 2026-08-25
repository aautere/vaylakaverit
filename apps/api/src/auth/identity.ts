import type { HttpRequest } from '@azure/functions';
import { randomBytes, randomUUID } from 'node:crypto';
import { guestSessionLifetimeMilliseconds, type GuestSessionStore } from './guest-session-store.js';

export { guestSessionLifetimeMilliseconds };

export type Session = {
  subject: string;
  displayName: string;
  expiresAt: Date;
  credentialVerifier: string;
};

export class InvalidDisplayNameError extends Error {
  public constructor() {
    super('Kirjoita 1–40 merkin nimi.');
  }
}

export class IdentityService {
  public constructor(
    private readonly guestSessions: GuestSessionStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async sessionFromRequest(request: HttpRequest): Promise<Session | undefined> {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token ? this.guestSessions.restore(token, this.now()) : undefined;
  }

  public async createGuestSession(displayName: string): Promise<{
    sessionToken: string;
    identityId: string;
    displayName: string;
    expiresAt: Date;
  }> {
    const normalizedDisplayName = validateDisplayName(displayName);
    const credential = randomBytes(32).toString('base64url');
    const session = await this.guestSessions.create(
      {
        credential,
        identityId: `guest:${randomUUID()}`,
        displayName: normalizedDisplayName,
      },
      this.now(),
    );
    return {
      sessionToken: credential,
      identityId: session.subject,
      displayName: session.displayName,
      expiresAt: session.expiresAt,
    };
  }

  public async revokeSession(session: Session): Promise<void> {
    await this.guestSessions.revoke(session.credentialVerifier, this.now());
  }
}

export function validateDisplayName(value: string): string {
  const displayName = value.trim();
  const visibleCharacterCount = [
    ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(displayName),
  ].filter(({ segment }) => /[\p{L}\p{N}\p{P}\p{S}]/u.test(segment)).length;
  if (
    !displayName ||
    /[\p{Cc}\p{Cs}]/u.test(displayName) ||
    visibleCharacterCount === 0 ||
    visibleCharacterCount > 40
  ) {
    throw new InvalidDisplayNameError();
  }

  return displayName;
}
