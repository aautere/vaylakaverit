import type { Container } from '@azure/cosmos';
import { describe, expect, it } from 'vitest';
import { CosmosRoundStore } from './cosmos-round-store.js';

function createContainerMock(): Container {
  const documents = new Map<string, Record<string, unknown>>();

  return {
    items: {
      create: async (document: Record<string, unknown>) => {
        documents.set(document.id as string, structuredClone(document));
        return {};
      },
      query: (querySpec: { parameters?: Array<{ name: string; value: unknown }> }) => ({
        fetchAll: async () => ({
          resources: [...documents.values()].filter((document) => {
            const state = querySpec.parameters?.find(
              (parameter) => parameter.name === '@state',
            )?.value;
            const invitation = querySpec.parameters?.find(
              (parameter) => parameter.name === '@invitationToken',
            )?.value;
            const round = document.round as { invitationToken?: unknown } | undefined;
            return (
              (state === undefined || document.state === state) &&
              (invitation === undefined || round?.invitationToken === invitation)
            );
          }),
        }),
      }),
    },
    item: (id: string) => ({
      read: async () => {
        const resource = documents.get(id);
        if (!resource) {
          throw { code: 404 };
        }
        return { resource: structuredClone(resource) };
      },
      replace: async (document: Record<string, unknown>) => {
        documents.set(id, structuredClone(document));
        return {};
      },
    }),
  } as unknown as Container;
}

describe('CosmosRoundStore', () => {
  it('persists an active round, its score, and its completed history', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const round = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: 'Kahvit',
    });
    const joinedRound = await store.join({
      roundId: round.id,
      invitationToken: round.invitationToken,
      identityId: 'guest:elli',
      name: 'Elli',
      handicapIndex: 18,
    });
    for (const player of joinedRound!.players) {
      await store.updatePlayer({
        roundId: round.id,
        playerId: player.id,
        identityId: player.identityId,
        name: player.name,
        handicapIndex: player.handicapIndex,
        teeLabel: player.teeLabel,
        ratingTable: player.ratingTable,
        ready: true,
      });
    }
    await store.start(round.id);

    await store.score({
      roundId: round.id,
      playerId: round.players[0]!.id,
      holeNumber: 1,
      strokes: 4,
      changeId: 'score-1',
    });
    const completed = await store.finish(round.id);

    expect(await store.get(round.id)).toBeUndefined();
    expect(completed).toMatchObject({
      id: round.id,
      scores: { [round.players[0]!.id]: { 1: 4 } },
    });
    expect(await store.getHistory(round.id)).toEqual(completed);
    expect(await store.history()).toEqual([completed]);
  });

  it('returns undefined instead of failing when a round does not exist', async () => {
    const store = new CosmosRoundStore(createContainerMock());

    await expect(store.get('missing')).resolves.toBeUndefined();
    await expect(store.finish('missing')).resolves.toBeUndefined();
  });

  it('persists the selected official table and looked-up playing handicap', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const round = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      teeLabel: '52',
      ratingTable: 'women',
      mode: 'handicap',
      reward: '',
    });

    expect(round.players[0]).toMatchObject({
      teeLabel: '52',
      ratingTable: 'women',
      handicapIndex: 18,
      playingHandicap: 24,
    });
    expect(await store.get(round.id)).toEqual(round);
  });

  it('persists a creator revocation and excludes the revoked invitation from lookup', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const round = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });

    const revoked = await store.revokeInvitation({
      roundId: round.id,
      creatorIdentityId: 'guest:aino',
    });

    expect(revoked?.invitationRevokedAt).toEqual(expect.any(String));
    expect(await store.getByInvitationToken(round.invitationToken)).toBeUndefined();
    expect(await store.get(round.id)).toMatchObject({
      invitationToken: round.invitationToken,
      invitationExpiresAt: expect.any(String),
      invitationRevokedAt: expect.any(String),
    });
  });

  it('lets a separate API store instance find and join an unstarted invitation', async () => {
    const container = createContainerMock();
    const creatorStore = new CosmosRoundStore(container);
    const recipientStore = new CosmosRoundStore(container);
    const round = await creatorStore.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });

    await expect(recipientStore.getByInvitationToken(round.invitationToken)).resolves.toMatchObject(
      {
        id: round.id,
        state: 'lobby',
      },
    );

    const invitation = { ['invitationToken']: round.invitationToken };
    const joinedRound = await recipientStore.join({
      roundId: round.id,
      ...invitation,
      identityId: 'guest:elli',
      name: 'Elli',
      handicapIndex: 18,
    });

    expect(joinedRound?.players.map((player) => player.name)).toEqual(['Aino', 'Elli']);
    await expect(creatorStore.get(round.id)).resolves.toMatchObject({
      players: [
        expect.objectContaining({ name: 'Aino' }),
        expect.objectContaining({ name: 'Elli' }),
      ],
    });
  });

  it('persists lobby readiness and starts only a ready two-player round', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const round = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });

    expect(await store.start(round.id)).toBeUndefined();
    const joined = await store.join({
      roundId: round.id,
      invitationToken: round.invitationToken,
      identityId: 'guest:elli',
      name: 'Elli',
      handicapIndex: 18,
    });
    for (const player of joined!.players) {
      await store.updatePlayer({
        roundId: round.id,
        playerId: player.id,
        identityId: player.identityId,
        name: player.name,
        handicapIndex: player.handicapIndex,
        teeLabel: player.teeLabel,
        ratingTable: player.ratingTable,
        ready: true,
      });
    }

    const started = await store.start(round.id);
    expect(started).toMatchObject({ state: 'active' });
    expect(started?.players).toEqual(
      expect.arrayContaining([expect.objectContaining({ ready: true })]),
    );
  });

  it('persists per-game tie settings through completed history', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const round = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });
    const joinedRound = await store.join({
      roundId: round.id,
      invitationToken: round.invitationToken,
      identityId: 'guest:elli',
      name: 'Elli',
      handicapIndex: 18,
    });
    const elli = joinedRound!.players[1]!;
    for (const player of joinedRound!.players) {
      await store.updatePlayer({
        roundId: round.id,
        playerId: player.id,
        identityId: player.identityId,
        name: player.name,
        handicapIndex: player.handicapIndex,
        teeLabel: player.teeLabel,
        ratingTable: player.ratingTable,
        ready: true,
      });
    }
    await store.start(round.id);
    for (let holeNumber = 1; holeNumber <= 3; holeNumber += 1) {
      await store.score({
        roundId: round.id,
        playerId: round.players[0]!.id,
        holeNumber,
        strokes: 4,
      });
    }

    await store.addSideGame({
      roundId: round.id,
      startHole: 4,
      holeCount: 3,
      mode: 'scratch',
      reward: 'Kahvit',
      holeTieRule: 'carry-forward',
      carryEligiblePlayerIds: [elli.id],
      endTieRule: 'continue',
    });

    const completed = await store.finish(round.id);
    expect(completed?.sideGames[0]).toMatchObject({
      holeTieRule: 'carry-forward',
      carryEligiblePlayerIds: [elli.id],
      endTieRule: 'continue',
    });
    expect(await store.getHistory(round.id)).toEqual(completed);
  });

  it('anonymizes the requesting identity in active and completed rounds only', async () => {
    const store = new CosmosRoundStore(createContainerMock());
    const activeRound = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });
    const completedRound = await store.create({
      identityId: 'guest:aino',
      name: 'Aino',
      handicapIndex: 18,
      mode: 'scratch',
      reward: '',
    });
    const elli = (await store.join({
      roundId: completedRound.id,
      invitationToken: completedRound.invitationToken,
      identityId: 'guest:elli',
      name: 'Elli',
      handicapIndex: 18,
    }))!.players[1]!;
    const joinedCompletedRound = (await store.get(completedRound.id))!;
    for (const player of joinedCompletedRound.players) {
      await store.updatePlayer({
        roundId: completedRound.id,
        playerId: player.id,
        identityId: player.identityId!,
        name: player.name,
        handicapIndex: player.handicapIndex,
        teeLabel: player.teeLabel,
        ratingTable: player.ratingTable,
        ready: true,
      });
    }
    await store.start(completedRound.id);
    await store.score({
      roundId: completedRound.id,
      playerId: completedRound.players[0]!.id,
      holeNumber: 1,
      strokes: 4,
    });
    await store.score({ roundId: completedRound.id, playerId: elli.id, holeNumber: 1, strokes: 5 });
    await store.finish(completedRound.id);

    await expect(store.deleteIdentity('guest:aino')).resolves.toEqual({ anonymizedRoundCount: 2 });
    expect(await store.get(activeRound.id)).toMatchObject({
      creatorIdentityId: undefined,
      players: [{ identityId: undefined, name: 'Poistettu pelaaja' }],
    });
    expect(await store.getHistory(completedRound.id)).toMatchObject({
      players: [
        { identityId: undefined, name: 'Poistettu pelaaja' },
        { identityId: 'guest:elli', name: 'Elli' },
      ],
      scores: {
        [completedRound.players[0]!.id]: { 1: 4 },
        [elli.id]: { 1: 5 },
      },
    });
  });
});
