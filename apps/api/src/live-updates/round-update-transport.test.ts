import { describe, expect, it, vi } from 'vitest';
import {
  PreviewRoundUpdateTransport,
  WebPubSubRoundUpdateTransport,
  roundGroup,
} from './round-update-transport.js';

describe('round update transports', () => {
  it('provides local polling without Azure credentials', async () => {
    await expect(
      new PreviewRoundUpdateTransport().createConnection('round-1', 'guest:aino'),
    ).resolves.toEqual({ kind: 'poll', pollIntervalMilliseconds: 1000 });
  });

  it('publishes only to the round participant group and scopes connection tokens to it', async () => {
    const sendToAll = vi.fn().mockResolvedValue(undefined);
    const getClientAccessToken = vi.fn().mockResolvedValue({ url: 'wss://example.test/token' });
    const transport = new WebPubSubRoundUpdateTransport({
      group: vi.fn().mockReturnValue({ sendToAll }),
      getClientAccessToken,
    });

    await transport.publish('round-1');
    await expect(transport.createConnection('round-1', 'apple:aino')).resolves.toEqual({
      kind: 'web-pubsub',
      url: 'wss://example.test/token',
    });

    expect(sendToAll).toHaveBeenCalledWith({ type: 'round.updated', roundId: 'round-1' });
    expect(getClientAccessToken).toHaveBeenCalledWith({
      userId: 'apple:aino',
      groups: [roundGroup('round-1')],
      expirationTimeInMinutes: 10,
    });
  });
});
