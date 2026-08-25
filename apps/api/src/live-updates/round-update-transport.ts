import { DefaultAzureCredential } from '@azure/identity';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import type { LiveUpdateConfig } from './config.js';

const groupPrefix = 'round:';

export type LiveConnection =
  { kind: 'poll'; pollIntervalMilliseconds: number } | { kind: 'web-pubsub'; url: string };

export type RoundUpdatedEvent = {
  type: 'round.updated';
  roundId: string;
};

export interface RoundUpdateTransport {
  publish(roundId: string): Promise<void>;
  createConnection(roundId: string, participantId: string): Promise<LiveConnection>;
}

export class PreviewRoundUpdateTransport implements RoundUpdateTransport {
  public async publish(_roundId: string): Promise<void> {}

  public async createConnection(_roundId: string, _participantId: string): Promise<LiveConnection> {
    return { kind: 'poll', pollIntervalMilliseconds: 1000 };
  }
}

type WebPubSubClient = Pick<WebPubSubServiceClient, 'getClientAccessToken' | 'group'>;

export class WebPubSubRoundUpdateTransport implements RoundUpdateTransport {
  public constructor(private readonly client: WebPubSubClient) {}

  public async publish(roundId: string): Promise<void> {
    const event: RoundUpdatedEvent = { type: 'round.updated', roundId };
    await this.client.group(roundGroup(roundId)).sendToAll(event);
  }

  public async createConnection(roundId: string, participantId: string): Promise<LiveConnection> {
    const token = await this.client.getClientAccessToken({
      userId: participantId,
      groups: [roundGroup(roundId)],
      expirationTimeInMinutes: 10,
    });

    return { kind: 'web-pubsub', url: token.url };
  }
}

export function createRoundUpdateTransport(config: LiveUpdateConfig): RoundUpdateTransport {
  if (config.kind === 'preview') {
    return new PreviewRoundUpdateTransport();
  }

  return new WebPubSubRoundUpdateTransport(
    new WebPubSubServiceClient(config.endpoint, new DefaultAzureCredential(), config.hub),
  );
}

export function roundGroup(roundId: string): string {
  return `${groupPrefix}${roundId}`;
}
