import type { HttpRequest } from '@azure/functions';
import { describe, expect, it } from 'vitest';
import {
  completePreviewRoundHandler,
  deleteAccountHandler,
  getPreviewInvitationHandler,
  getPreviewRoundHandler,
  getRoundLiveConnectionHandler,
  getCompletedPreviewRoundHandler,
  joinPreviewRoundHandler,
  listCompletedPreviewRoundsHandler,
  recordPreviewScoreHandler,
  revokePreviewInvitationHandler,
  startPreviewRoundHandler,
  updatePreviewRoundPlayerHandler,
} from './index.js';
import { createPreviewRound, joinPreviewRound, previewRoundStore } from './preview-store.js';

function requestFor(roundId: string, guestId?: string): HttpRequest {
  return {
    params: { roundId },
    headers: new Headers(guestId ? { 'x-preview-guest-id': guestId } : {}),
  } as unknown as HttpRequest;
}

function scoreRequestFor(
  roundId: string,
  playerId: string,
  guestId: string,
  expectedRevision = 0,
): HttpRequest {
  return {
    params: { roundId },
    headers: new Headers({ 'x-preview-guest-id': guestId }),
    json: async () => ({ playerId, holeNumber: 1, strokes: 4, expectedRevision }),
  } as unknown as HttpRequest;
}

function playerSettingsRequest(
  roundId: string,
  playerId: string,
  guestId: string,
  settings: Record<string, unknown>,
): HttpRequest {
  return {
    params: { roundId, playerId },
    headers: new Headers({ 'x-preview-guest-id': guestId }),
    json: async () => settings,
  } as unknown as HttpRequest;
}

function startRequestFor(roundId: string, guestId: string): HttpRequest {
  return {
    params: { roundId },
    headers: new Headers({ 'x-preview-guest-id': guestId }),
  } as unknown as HttpRequest;
}

function readyRound(roundId: string) {
  const round = previewRoundStore.get(roundId)!;
  for (const player of round.players) {
    previewRoundStore.updatePlayer({
      roundId,
      playerId: player.id,
      identityId: player.identityId,
      name: player.name,
      handicapIndex: player.handicapIndex,
      teeLabel: player.teeLabel,
      ratingTable: player.ratingTable,
      ready: true,
    });
  }
  return previewRoundStore.start(roundId)!;
}

describe('completed round history API', () => {
  it('finishes a round and exposes it through the completed-round endpoints', async () => {
    const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
    joinPreviewRound(round.id, 'Elli', 18, 'guest:elli');
    readyRound(round.id);

    const completed = await completePreviewRoundHandler(requestFor(round.id, 'aino'));
    const history = await listCompletedPreviewRoundsHandler(requestFor(''));
    const detail = await getCompletedPreviewRoundHandler(requestFor(round.id));

    expect(completed.status).toBe(200);
    expect(completed.jsonBody).toMatchObject({ id: round.id, outcome: { kind: 'draw' } });
    expect(history.jsonBody).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: round.id })]),
    );
    expect(detail.jsonBody).toMatchObject({ id: round.id, courseName: 'Golf Talma Master' });
  });

  describe('account deletion authorization', () => {
    it('rejects a deletion request without a valid authenticated session', async () => {
      const deleted = await deleteAccountHandler({
        headers: new Headers({ 'x-preview-guest-id': 'not valid' }),
      } as unknown as HttpRequest);

      expect(deleted.status).toBe(401);
    });

    it('anonymizes only the authenticated player and leaves shared scores intact', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:delete-aino');
      const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:delete-elli')!.players[1]!;
      readyRound(round.id);
      previewRoundStore.score({
        roundId: round.id,
        playerId: round.players[0]!.id,
        holeNumber: 1,
        strokes: 4,
      });
      previewRoundStore.score({ roundId: round.id, playerId: elli.id, holeNumber: 1, strokes: 5 });

      const deleted = await deleteAccountHandler(requestFor('', 'delete-aino'));
      const snapshot = await getPreviewRoundHandler(requestFor(round.id, 'delete-elli'));
      const deletedPlayerScore = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, round.players[0]!.id, 'delete-aino'),
      );

      expect(deleted.status).toBe(200);
      expect(deleted.jsonBody).toEqual({ anonymizedRoundCount: 1 });
      expect(snapshot.jsonBody).toMatchObject({
        players: [
          { identityId: undefined, name: 'Poistettu pelaaja' },
          { identityId: 'guest:delete-elli', name: 'Elli' },
        ],
        scores: {
          [round.players[0]!.id]: { 1: 4 },
          [elli.id]: { 1: 5 },
        },
      });
      expect(deletedPlayerScore.status).toBe(403);
    });
  });

  describe('score authorization', () => {
    it('limits invitation access to viewing and joining until the guest has joined', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
      const viewerRequest = {
        params: { invitationToken: round.invitationToken },
        headers: new Headers({ 'x-preview-guest-id': 'viewer' }),
      } as unknown as HttpRequest;
      const joinRequest = {
        ...viewerRequest,
        json: async () => ({ name: 'Veera', handicapIndex: 18 }),
      } as unknown as HttpRequest;

      const invitedRound = await getPreviewInvitationHandler(viewerRequest);
      const blockedSnapshot = await getPreviewRoundHandler(requestFor(round.id, 'viewer'));
      const blockedScore = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, round.players[0]!.id, 'viewer'),
      );
      const blockedCompletion = await completePreviewRoundHandler(requestFor(round.id, 'viewer'));
      const joinedRound = await joinPreviewRoundHandler(joinRequest);
      const joinedPlayer = (
        joinedRound.jsonBody as { players: Array<{ id: string; name: string }> }
      ).players.find((player) => player.name === 'Veera')!;
      const acceptedScore = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, joinedPlayer.id, 'viewer'),
      );

      expect(invitedRound.status).toBe(200);
      expect(blockedSnapshot.status).toBe(403);
      expect(blockedScore.status).toBe(403);
      expect(blockedCompletion.status).toBe(403);
      expect(joinedRound.status).toBe(200);
      expect(acceptedScore.status).toBe(400);
    });

    it('rejects expired invitations for both viewing and joining', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:expired-aino');
      round.invitationExpiresAt = new Date(Date.now() - 1_000).toISOString();
      const invitationRequest = {
        params: { invitationToken: round.invitationToken },
        headers: new Headers({ 'x-preview-guest-id': 'expired-viewer' }),
      } as unknown as HttpRequest;
      const joinRequest = {
        ...invitationRequest,
        json: async () => ({ name: 'Veera', handicapIndex: 18 }),
      } as unknown as HttpRequest;

      const view = await getPreviewInvitationHandler(invitationRequest);
      const join = await joinPreviewRoundHandler(joinRequest);

      expect(view).toMatchObject({ status: 404 });
      expect(join).toMatchObject({ status: 404 });
      expect(round.players).toHaveLength(1);
    });

    it('lets only the creator revoke an invitation and blocks the old link afterwards', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:revoke-aino');
      const creatorRequest = requestFor(round.id, 'revoke-aino');
      const otherRequest = requestFor(round.id, 'revoke-elli');
      const invitationRequest = {
        params: { invitationToken: round.invitationToken },
        headers: new Headers({ 'x-preview-guest-id': 'revoke-viewer' }),
      } as unknown as HttpRequest;
      const joinRequest = {
        ...invitationRequest,
        json: async () => ({ name: 'Veera', handicapIndex: 18 }),
      } as unknown as HttpRequest;

      const denied = await revokePreviewInvitationHandler(otherRequest);
      const revoked = await revokePreviewInvitationHandler(creatorRequest);
      const view = await getPreviewInvitationHandler(invitationRequest);
      const join = await joinPreviewRoundHandler(joinRequest);

      expect(denied).toMatchObject({ status: 403 });
      expect(revoked).toMatchObject({
        status: 200,
        jsonBody: { invitationRevokedAt: expect.any(String) },
      });
      expect(view).toMatchObject({ status: 404 });
      expect(join).toMatchObject({ status: 404 });
      expect(round.players).toHaveLength(1);
    });

    it('prevents one participant from recording another participant’s score', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
      const otherPlayer = joinPreviewRound(round.id, 'Elli', 18, 'guest:elli')!.players[1]!;
      readyRound(round.id);

      const denied = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, round.players[0]!.id, 'elli'),
      );
      const accepted = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, otherPlayer.id, 'elli'),
      );

      expect(denied.status).toBe(403);
      expect(round.scores[round.players[0]!.id]).toBeUndefined();
      expect(accepted.status).toBe(200);
      expect(round.scores[otherPlayer.id]?.[1]).toBe(4);
    });

    it('returns the authoritative score snapshot when a correction revision is stale', async () => {
      const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:revision-aino');
      const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:revision-elli')!.players[1]!;
      readyRound(round.id);

      const initial = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, round.players[0]!.id, 'revision-aino', 0),
      );
      const staleCorrection = await recordPreviewScoreHandler(
        scoreRequestFor(round.id, round.players[0]!.id, 'revision-aino', 0),
      );

      expect(initial.status).toBe(200);
      expect(staleCorrection.status).toBe(409);
      expect(staleCorrection.jsonBody).toMatchObject({
        currentRevision: 1,
        round: {
          scores: { [round.players[0]!.id]: { 1: 4 } },
          scoreRevisions: { [round.players[0]!.id]: { 1: 1 } },
        },
      });
      expect(round.scores[elli.id]).toBeUndefined();
    });

    describe('live round connections', () => {
      it('allows local update polling only for a joined participant', async () => {
        const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');

        const participant = await getRoundLiveConnectionHandler(requestFor(round.id, 'aino'));
        const viewer = await getRoundLiveConnectionHandler(requestFor(round.id, 'viewer'));

        expect(participant.jsonBody).toEqual({ kind: 'poll', pollIntervalMilliseconds: 1000 });
        expect(viewer.status).toBe(403);
      });

      it('gives a reconnecting participant the authoritative persisted score snapshot', async () => {
        const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:reconnect-aino');
        const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:reconnect-elli')!.players[1]!;
        readyRound(round.id);

        await recordPreviewScoreHandler(
          scoreRequestFor(round.id, round.players[0]!.id, 'reconnect-aino'),
        );
        const reconnectedSnapshot = await getPreviewRoundHandler(
          requestFor(round.id, 'reconnect-elli'),
        );

        expect(reconnectedSnapshot.status).toBe(200);
        expect(reconnectedSnapshot.jsonBody).toMatchObject({
          scores: { [round.players[0]!.id]: { 1: 4 } },
          players: expect.arrayContaining([expect.objectContaining({ id: elli.id })]),
        });
      });
    });

    describe('round lobby API', () => {
      it('allows only a participant to confirm their own settings and only the creator to start', async () => {
        const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
        const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:elli')!.players[1]!;
        const aino = round.players[0]!;

        const crossPlayerUpdate = await updatePreviewRoundPlayerHandler(
          playerSettingsRequest(round.id, aino.id, 'elli', {
            name: 'Aino muuttui',
            handicapIndex: 18,
            teeLabel: '52',
            ratingTable: 'men',
            ready: true,
          }),
        );
        const incompleteStart = await startPreviewRoundHandler(startRequestFor(round.id, 'aino'));
        const participantStart = await startPreviewRoundHandler(startRequestFor(round.id, 'elli'));
        const ainoReady = await updatePreviewRoundPlayerHandler(
          playerSettingsRequest(round.id, aino.id, 'aino', {
            name: 'Aino',
            handicapIndex: 18,
            teeLabel: '52',
            ratingTable: 'men',
            ready: true,
          }),
        );
        const elliReady = await updatePreviewRoundPlayerHandler(
          playerSettingsRequest(round.id, elli.id, 'elli', {
            name: 'Elli',
            handicapIndex: 18,
            teeLabel: '56',
            ratingTable: 'women',
            ready: true,
          }),
        );
        const started = await startPreviewRoundHandler(startRequestFor(round.id, 'aino'));

        expect(crossPlayerUpdate.status).toBe(403);
        expect(incompleteStart.status).toBe(400);
        expect(participantStart.status).toBe(403);
        expect(ainoReady.status).toBe(200);
        expect(elliReady.jsonBody).toMatchObject({
          players: expect.arrayContaining([expect.objectContaining({ name: 'Aino', ready: true })]),
        });
        expect(started.jsonBody).toMatchObject({
          state: 'active',
          players: expect.arrayContaining([
            expect.objectContaining({
              name: 'Elli',
              teeLabel: '56',
              ratingTable: 'women',
              ready: true,
            }),
          ]),
        });
      });

      it('rejects scores before a creator starts the ready lobby', async () => {
        const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:aino');
        const elli = joinPreviewRound(round.id, 'Elli', 18, 'guest:elli')!.players[1]!;

        const score = await recordPreviewScoreHandler(scoreRequestFor(round.id, elli.id, 'elli'));

        expect(score.status).toBe(400);
        expect(round.scores).toEqual({});
      });

      it('rejects a fifth authenticated guest after four players have joined by invitation', async () => {
        const round = createPreviewRound('Aino', 18, 'scratch', '', 'guest:limit-aino');
        const join = (guestId: string, name: string): HttpRequest =>
          ({
            params: { invitationToken: round.invitationToken },
            headers: new Headers({ 'x-preview-guest-id': guestId }),
            json: async () => ({ name, handicapIndex: 18 }),
          }) as unknown as HttpRequest;

        await expect(joinPreviewRoundHandler(join('limit-elli', 'Elli'))).resolves.toMatchObject({
          status: 200,
        });
        await expect(joinPreviewRoundHandler(join('limit-sanni', 'Sanni'))).resolves.toMatchObject({
          status: 200,
        });
        await expect(joinPreviewRoundHandler(join('limit-pekka', 'Pekka'))).resolves.toMatchObject({
          status: 200,
        });
        const rejected = await joinPreviewRoundHandler(join('limit-veera', 'Veera'));

        expect(round.players).toHaveLength(4);
        expect(rejected).toMatchObject({
          status: 409,
          jsonBody: {
            error: 'Kierros on täynnä. Voit silti katsella kierrosta kutsulinkillä.',
          },
        });
      });
    });
  });
});
