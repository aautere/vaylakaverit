import { createHash } from 'node:crypto';
import type { Container } from '@azure/cosmos';

export type GuestSession = {
  subject: string;
  displayName: string;
  expiresAt: Date;
  credentialVerifier: string;
};

export type CreateGuestSessionInput = {
  credential: string;
  identityId: string;
  displayName: string;
};

export interface GuestSessionStore {
  create(input: CreateGuestSessionInput, now: Date): Promise<GuestSession>;
  restore(credential: string, now: Date): Promise<GuestSession | undefined>;
  revoke(credentialVerifier: string, now: Date): Promise<void>;
}

export const guestSessionLifetimeMilliseconds = 180 * 24 * 60 * 60 * 1000;

type GuestSessionDocument = {
  id: string;
  roundId: string;
  documentType: 'guest-session';
  credentialVerifier: string;
  identityId: string;
  displayName: string;
  lastAuthenticatedAt: string;
  revokedAt?: string;
  _etag?: string;
};

export class PreviewGuestSessionStore implements GuestSessionStore {
  private readonly sessions = new Map<string, GuestSessionDocument>();

  public async create(input: CreateGuestSessionInput, now: Date): Promise<GuestSession> {
    const credentialVerifier = verifierFor(input.credential);
    const document: GuestSessionDocument = {
      id: credentialVerifier,
      roundId: credentialVerifier,
      documentType: 'guest-session',
      credentialVerifier,
      identityId: input.identityId,
      displayName: input.displayName,
      lastAuthenticatedAt: now.toISOString(),
    };
    this.sessions.set(credentialVerifier, document);
    return asSession(document, now);
  }

  public async restore(credential: string, now: Date): Promise<GuestSession | undefined> {
    const credentialVerifier = verifierFor(credential);
    const document = this.sessions.get(credentialVerifier);
    if (!document || !isCurrent(document, now)) {
      if (document && !document.revokedAt) {
        document.revokedAt = now.toISOString();
      }
      return undefined;
    }

    document.lastAuthenticatedAt = now.toISOString();
    return asSession(document, now);
  }

  public async revoke(credentialVerifier: string, now: Date): Promise<void> {
    const document = this.sessions.get(credentialVerifier);
    if (document && !document.revokedAt) {
      document.revokedAt = now.toISOString();
    }
  }
}

export class CosmosGuestSessionStore implements GuestSessionStore {
  public constructor(private readonly container: Container) {}

  public async create(input: CreateGuestSessionInput, now: Date): Promise<GuestSession> {
    const credentialVerifier = verifierFor(input.credential);
    const document: GuestSessionDocument = {
      id: credentialVerifier,
      roundId: credentialVerifier,
      documentType: 'guest-session',
      credentialVerifier,
      identityId: input.identityId,
      displayName: input.displayName,
      lastAuthenticatedAt: now.toISOString(),
    };
    await this.container.items.create(document);
    return asSession(document, now);
  }

  public async restore(credential: string, now: Date): Promise<GuestSession | undefined> {
    const credentialVerifier = verifierFor(credential);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const document = await this.read(credentialVerifier);
      if (!document || !isCurrent(document, now)) {
        if (document && !document.revokedAt) {
          await this.revokeDocument(document, now);
        }
        return undefined;
      }

      document.lastAuthenticatedAt = now.toISOString();
      try {
        await this.replaceCurrent(document);
        return asSession(document, now);
      } catch (error) {
        if (!isPreconditionFailed(error)) {
          throw error;
        }
      }
    }

    return undefined;
  }

  public async revoke(credentialVerifier: string, now: Date): Promise<void> {
    const document = await this.read(credentialVerifier);
    if (document && !document.revokedAt) {
      await this.revokeDocument(document, now);
    }
  }

  private async read(credentialVerifier: string): Promise<GuestSessionDocument | undefined> {
    try {
      const { resource } = await this.container
        .item(credentialVerifier, credentialVerifier)
        .read<GuestSessionDocument>();
      return resource;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        ('code' in error || 'statusCode' in error) &&
        ((error as { code?: unknown }).code === 404 ||
          (error as { statusCode?: unknown }).statusCode === 404)
      ) {
        return undefined;
      }
      throw error;
    }
  }

  private async revokeDocument(document: GuestSessionDocument, now: Date): Promise<void> {
    let currentDocument = document;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (currentDocument.revokedAt) {
        return;
      }

      currentDocument.revokedAt = now.toISOString();
      try {
        await this.replaceCurrent(currentDocument);
        return;
      } catch (error) {
        if (!isPreconditionFailed(error)) {
          throw error;
        }
      }

      const refreshedDocument = await this.read(currentDocument.credentialVerifier);
      if (!refreshedDocument) {
        return;
      }
      currentDocument = refreshedDocument;
    }

    throw new Error('Guest session revocation could not be confirmed.');
  }

  private async replaceCurrent(document: GuestSessionDocument): Promise<void> {
    if (!document._etag) {
      throw new Error('Guest session record is missing its concurrency token.');
    }

    await this.container.item(document.id, document.roundId).replace(document, {
      accessCondition: {
        type: 'IfMatch',
        condition: document._etag,
      },
    });
  }
}

function verifierFor(credential: string): string {
  return createHash('sha256').update(credential).digest('base64url');
}

function isCurrent(document: GuestSessionDocument, now: Date): boolean {
  const lastAuthenticatedAt = Date.parse(document.lastAuthenticatedAt);
  return (
    !document.revokedAt &&
    Number.isFinite(lastAuthenticatedAt) &&
    lastAuthenticatedAt + guestSessionLifetimeMilliseconds > now.getTime()
  );
}

function isPreconditionFailed(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'statusCode' in error) &&
    ((error as { code?: unknown }).code === 412 ||
      (error as { statusCode?: unknown }).statusCode === 412)
  );
}

function asSession(document: GuestSessionDocument, now: Date): GuestSession {
  return {
    subject: document.identityId,
    displayName: document.displayName,
    expiresAt: new Date(now.getTime() + guestSessionLifetimeMilliseconds),
    credentialVerifier: document.credentialVerifier,
  };
}
