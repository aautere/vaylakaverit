import { describe, expect, it } from 'vitest';
import { JwtSessionCodec } from './session.js';

describe('JwtSessionCodec', () => {
  const codec = new JwtSessionCodec('a-session-secret-with-at-least-32-characters');
  const expiresAt = new Date('2026-08-26T12:00:00.000Z');

  it('issues and verifies an authenticated session', () => {
    const token = codec.issue('apple:player-123', 'apple', expiresAt);

    expect(codec.verify(token, new Date('2026-08-25T12:00:00.000Z'))).toEqual({
      subject: 'apple:player-123',
      authentication: 'apple',
      expiresAt,
    });
  });

  it('rejects modified and expired session tokens', () => {
    const token = codec.issue('apple:player-123', 'apple', expiresAt);

    expect(codec.verify(`${token}changed`, new Date('2026-08-25T12:00:00.000Z'))).toBeUndefined();
    expect(codec.verify(token, new Date('2026-08-27T12:00:00.000Z'))).toBeUndefined();
  });
});
