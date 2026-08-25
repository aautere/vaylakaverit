import type { HttpRequest } from '@azure/functions';
import type { Container } from '@azure/cosmos';
import { describe, expect, it } from 'vitest';
import { CosmosGuestSessionStore, PreviewGuestSessionStore } from './guest-session-store.js';
import { IdentityService, InvalidDisplayNameError } from './identity.js';

function requestFor(token: string): HttpRequest {
  return { headers: new Headers({ authorization: `Bearer ${token}` }) } as unknown as HttpRequest;
}

describe('guest identity service', () => {
  it('creates opaque credentials and restores the same guest from a valid credential', async () => {
    const service = new IdentityService(new PreviewGuestSessionStore());
    const created = await service.createGuestSession('  Aino  ');

    expect(created.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.sessionToken).not.toContain('Aino');
    await expect(
      service.sessionFromRequest(requestFor(created.sessionToken)),
    ).resolves.toMatchObject({
      subject: expect.stringMatching(/^guest:/),
      displayName: 'Aino',
    });
  });

  it('rejects blank, invisible, control-character, and overlong display names', async () => {
    const service = new IdentityService(new PreviewGuestSessionStore());

    await expect(service.createGuestSession('   ')).rejects.toBeInstanceOf(InvalidDisplayNameError);
    await expect(service.createGuestSession(String.fromCodePoint(0x200b))).rejects.toBeInstanceOf(
      InvalidDisplayNameError,
    );
    await expect(service.createGuestSession(`Aino\u0000`)).rejects.toBeInstanceOf(
      InvalidDisplayNameError,
    );
    await expect(service.createGuestSession('a'.repeat(41))).rejects.toBeInstanceOf(
      InvalidDisplayNameError,
    );
  });

  it('expires after 180 days of inactivity and rejects revoked credentials', async () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const service = new IdentityService(new PreviewGuestSessionStore(), () => now);
    const created = await service.createGuestSession('Aino');

    now = new Date(now.getTime() + 179 * 24 * 60 * 60 * 1000);
    expect(await service.sessionFromRequest(requestFor(created.sessionToken))).toBeDefined();
    now = new Date(now.getTime() + 179 * 24 * 60 * 60 * 1000);
    expect(await service.sessionFromRequest(requestFor(created.sessionToken))).toBeDefined();
    now = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000 + 1);
    expect(await service.sessionFromRequest(requestFor(created.sessionToken))).toBeUndefined();

    const replacement = await service.createGuestSession('Elli');
    const session = await service.sessionFromRequest(requestFor(replacement.sessionToken));
    await service.revokeSession(session!);
    expect(await service.sessionFromRequest(requestFor(replacement.sessionToken))).toBeUndefined();
  });

  it('does not restore a session after a concurrent Cosmos revocation', async () => {
    let document: Record<string, unknown> | undefined;
    let replaceCount = 0;
    const container = {
      items: {
        create: async (created: Record<string, unknown>) => {
          document = { ...created, _etag: 'first-version' };
        },
      },
      item: () => ({
        read: async () => ({ resource: document ? { ...document } : undefined }),
        replace: async (
          replacement: Record<string, unknown>,
          options: { accessCondition?: { condition: string } },
        ) => {
          if (replaceCount === 0) {
            replaceCount += 1;
            document = {
              ...document,
              revokedAt: '2026-01-01T00:00:01.000Z',
              _etag: 'revoked-version',
            };
            throw { statusCode: 412 };
          }

          expect(options.accessCondition?.condition).toBe(document?._etag);
          document = { ...replacement, _etag: 'next-version' };
        },
      }),
    } as unknown as Container;
    const store = new CosmosGuestSessionStore(container);
    const service = new IdentityService(store, () => new Date('2026-01-01T00:00:00.000Z'));
    const created = await service.createGuestSession('Aino');

    await expect(
      service.sessionFromRequest(requestFor(created.sessionToken)),
    ).resolves.toBeUndefined();
    expect(document).toMatchObject({ revokedAt: '2026-01-01T00:00:01.000Z' });
  });
});
