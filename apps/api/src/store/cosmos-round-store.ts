import type { Container } from '@azure/cosmos';
import {
  addSideGame,
  anonymizeIdentity,
  createRound,
  finishRound,
  joinRound,
  scoreRound,
  type AddSideGameInput,
  type CompletedRound,
  type CreateRoundInput,
  type DeleteIdentityResult,
  type JoinRoundInput,
  type Round,
  type RoundStore,
  type ScoreRoundInput,
  type UpdateRoundPlayerInput,
  startRound,
  updateRoundPlayer,
} from './round-store.js';

type ActiveRoundDocument = {
  id: string;
  roundId: string;
  documentType: 'round';
  state: 'active';
  round: Round;
  processedScoreChangeIds: string[];
};

type CompletedRoundDocument = {
  id: string;
  roundId: string;
  documentType: 'round';
  state: 'completed';
  completedRound: CompletedRound;
};

type RoundDocument = ActiveRoundDocument | CompletedRoundDocument;

export class CosmosRoundStore implements RoundStore {
  public constructor(private readonly container: Container) {}

  public async create(input: CreateRoundInput): Promise<Round> {
    const round = createRound(input);
    const document: ActiveRoundDocument = {
      id: round.id,
      roundId: round.id,
      documentType: 'round',
      state: 'active',
      round,
      processedScoreChangeIds: [],
    };

    await this.container.items.create(document);
    return round;
  }

  public async get(roundId: string): Promise<Round | undefined> {
    const stored = await this.read(roundId);
    return stored?.document.state === 'active' ? stored.document.round : undefined;
  }

  public async getByInvitationToken(invitationToken: string): Promise<Round | undefined> {
    const { resources } = await this.container.items
      .query<ActiveRoundDocument>({
        query:
          'SELECT * FROM c WHERE c.documentType = @documentType AND c.state = @state AND c.round.invitationToken = @invitationToken',
        parameters: [
          { name: '@documentType', value: 'round' },
          { name: '@state', value: 'active' },
          { name: '@invitationToken', value: invitationToken },
        ],
      })
      .fetchAll();

    return resources[0]?.round;
  }

  public async join(input: JoinRoundInput): Promise<Round | undefined> {
    return this.updateActiveRound(input.roundId, (document) =>
      joinRound(document.round, input) ? document.round : undefined,
    );
  }

  public async updatePlayer(input: UpdateRoundPlayerInput): Promise<Round | undefined> {
    return this.updateActiveRound(input.roundId, (document) =>
      updateRoundPlayer(document.round, input) ? document.round : undefined,
    );
  }

  public async start(roundId: string): Promise<Round | undefined> {
    return this.updateActiveRound(roundId, (document) =>
      startRound(document.round) ? document.round : undefined,
    );
  }

  public async score(input: ScoreRoundInput): Promise<Round | undefined> {
    return this.updateActiveRound(input.roundId, (document) => {
      const result = scoreRound(document.round, input, new Set(document.processedScoreChangeIds));

      if (!result) {
        return undefined;
      }

      if (input.changeId && !document.processedScoreChangeIds.includes(input.changeId)) {
        document.processedScoreChangeIds.push(input.changeId);
      }
      return result;
    });
  }

  public async addSideGame(input: AddSideGameInput): Promise<Round | undefined> {
    return this.updateActiveRound(input.roundId, (document) =>
      addSideGame(document.round, input) ? document.round : undefined,
    );
  }

  public async finish(roundId: string): Promise<CompletedRound | undefined> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const stored = await this.read(roundId);
      const document = stored?.document;
      if (!document || document.state !== 'active' || document.round.state !== 'active') {
        return undefined;
      }

      const completedRound = finishRound(document.round);
      const completedDocument: CompletedRoundDocument = {
        id: document.id,
        roundId: document.roundId,
        documentType: 'round',
        state: 'completed',
        completedRound,
      };
      try {
        await this.replace(roundId, completedDocument, stored.etag);
        return completedRound;
      } catch (error) {
        if (!isPreconditionFailed(error) || attempt === 2) {
          throw error;
        }
      }
    }

    return undefined;
  }

  public async history(): Promise<CompletedRound[]> {
    const { resources } = await this.container.items
      .query<CompletedRoundDocument>({
        query: 'SELECT * FROM c WHERE c.documentType = @documentType AND c.state = @state',
        parameters: [
          { name: '@documentType', value: 'round' },
          { name: '@state', value: 'completed' },
        ],
      })
      .fetchAll();

    return resources
      .map((document) => document.completedRound)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt));
  }

  public async getHistory(roundId: string): Promise<CompletedRound | undefined> {
    const stored = await this.read(roundId);
    return stored?.document.state === 'completed' ? stored.document.completedRound : undefined;
  }

  public async deleteIdentity(identityId: string): Promise<DeleteIdentityResult> {
    const { resources } = await this.container.items
      .query<RoundDocument>({
        query: 'SELECT * FROM c WHERE c.documentType = @documentType',
        parameters: [{ name: '@documentType', value: 'round' }],
      })
      .fetchAll();
    let anonymizedRoundCount = 0;

    for (const document of resources) {
      const round = document.state === 'active' ? document.round : document.completedRound;
      if (!anonymizeIdentity(round, identityId)) {
        continue;
      }

      await this.container.item(document.id, document.roundId).replace(document);
      anonymizedRoundCount += 1;
    }

    return { anonymizedRoundCount };
  }

  private async updateActiveRound(
    roundId: string,
    update: (document: ActiveRoundDocument) => Round | undefined,
  ): Promise<Round | undefined> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const stored = await this.read(roundId);
      const document = stored?.document;
      if (!document || document.state !== 'active') {
        return undefined;
      }

      const round = update(document);
      if (!round) {
        return undefined;
      }

      try {
        await this.replace(roundId, document, stored.etag);
        return round;
      } catch (error) {
        if (!isPreconditionFailed(error) || attempt === 2) {
          throw error;
        }
      }
    }

    return undefined;
  }

  private async read(
    roundId: string,
  ): Promise<{ document: RoundDocument; etag?: string } | undefined> {
    try {
      const { resource, etag } = await this.container.item(roundId, roundId).read<RoundDocument>();
      return resource ? { document: resource, etag } : undefined;
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private async replace(roundId: string, document: RoundDocument, etag?: string): Promise<void> {
    await this.container
      .item(roundId, roundId)
      .replace(
        document,
        etag ? { accessCondition: { type: 'IfMatch', condition: etag } } : undefined,
      );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'statusCode' in error) &&
    ((error as { code?: unknown }).code === 404 ||
      (error as { statusCode?: unknown }).statusCode === 404)
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
