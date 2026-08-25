import type { HttpRequest } from '@azure/functions';
import { describe, expect, it } from 'vitest';
import {
  clearGuestSessionHandler,
  createGuestSessionHandler,
  createPreviewRoundHandler,
  deleteGuestDataHandler,
  getCompletedPreviewRoundHandler,
  getPreviewInvitationHandler,
  getPreviewRoundHandler,
  getRoundLiveConnectionHandler,
  identityService,
  joinPreviewRoundHandler,
  listCompletedPreviewRoundsHandler,
  recordPreviewScoreHandler,
  revokePreviewInvitationHandler,
  updatePreviewRoundPlayerHandler,
} from './index.js';
import { previewRoundStore } from './preview-store.js';

type Guest = { token: string; subject: string; displayName: string };

async function guest(displayName: string): Promise<Guest> {
  const created = await identityService.createGuestSession(displayName);
  const session = await identityService.sessionFromRequest(requestFor('', created.sessionToken));
  return { token: created.sessionToken, subject: session!.subject, displayName };
}

function requestFor(
  roundId: string,
  token: string,
  body?: Record<string, unknown>,
  params: Record<string, string> = {},
): HttpRequest {
  return {
    params: { roundId, ...params },
    headers: new Headers({ authorization: `Bearer ${token}` }),
    json: async () => body ?? {},
  } as unknown as HttpRequest;
}

async function createRound(creator: Guest) {
  const response = await createPreviewRoundHandler(
    requestFor('', creator.token, {
      handicapIndex: 18,
      ratingTable: 'men',
      mode: 'scratch',
      reward: '',
    }),
  );
  return response.jsonBody as {
    id: string;
    invitationToken: string;
    players: Array<{ id: string }>;
  };
}

describe('guest-first round API', () => {
  it('creates a validated guest session and makes that guest the first round participant', async () => {
    const created = await createGuestSessionHandler({
      headers: new Headers(),
      json: async () => ({ displayName: '  Aino  ' }),
    } as unknown as HttpRequest);
    const createdGuest = created.jsonBody as { sessionToken: string; identityId: string };
    const token = createdGuest.sessionToken;
    const session = await identityService.sessionFromRequest(requestFor('', token));
    const round = await createRound({ token, subject: session!.subject, displayName: 'Aino' });

    expect(created).toMatchObject({ status: 201, jsonBody: { displayName: 'Aino' } });
    expect(createdGuest.identityId).toBe(session!.subject);
    expect(round.players).toHaveLength(1);
    expect(previewRoundStore.get(round.id)).toMatchObject({ creatorIdentityId: session!.subject });
  });

  it('does not disclose round data or live access from an invitation before joining', async () => {
    const creator = await guest('Aino');
    const visitor = await guest('Veera');
    const round = await createRound(creator);

    const invitation = await getPreviewInvitationHandler(
      requestFor('', visitor.token, undefined, { invitationToken: round.invitationToken }),
    );
    const snapshot = await getPreviewRoundHandler(requestFor(round.id, visitor.token));
    const live = await getRoundLiveConnectionHandler(requestFor(round.id, visitor.token));
    const joined = await joinPreviewRoundHandler(
      requestFor(
        '',
        visitor.token,
        { handicapIndex: 18, ratingTable: 'women' },
        {
          invitationToken: round.invitationToken,
        },
      ),
    );
    const joinedSnapshot = await getPreviewRoundHandler(requestFor(round.id, visitor.token));

    expect(invitation.jsonBody).toEqual({
      invitationToken: round.invitationToken,
      joinRequired: true,
    });
    expect(snapshot.status).toBe(403);
    expect(live.status).toBe(403);
    expect(joined.status).toBe(200);
    expect(joinedSnapshot.status).toBe(200);
  });

  it('restricts lobby, invitation, and score mutations to joined participants and own scores', async () => {
    const creator = await guest('Aino');
    const participant = await guest('Elli');
    const outsider = await guest('Veera');
    const round = await createRound(creator);
    await joinPreviewRoundHandler(
      requestFor(
        '',
        participant.token,
        { handicapIndex: 18, ratingTable: 'women' },
        {
          invitationToken: round.invitationToken,
        },
      ),
    );
    const stored = previewRoundStore.get(round.id)!;
    const creatorPlayer = stored.players[0]!;
    const participantPlayer = stored.players[1]!;

    const lobby = await updatePreviewRoundPlayerHandler(
      requestFor(
        round.id,
        participant.token,
        {
          name: 'Aino muuttui',
          handicapIndex: 18,
          teeLabel: '52',
          ratingTable: 'men',
          ready: true,
        },
        { playerId: creatorPlayer.id },
      ),
    );
    const revoke = await revokePreviewInvitationHandler(requestFor(round.id, outsider.token));
    const score = await recordPreviewScoreHandler(
      requestFor(round.id, participant.token, {
        playerId: creatorPlayer.id,
        holeNumber: 1,
        strokes: 4,
        expectedRevision: 0,
      }),
    );

    expect(lobby.status).toBe(403);
    expect(revoke.status).toBe(403);
    expect(score.status).toBe(403);
    expect(stored.players.find((player) => player.id === participantPlayer.id)?.ratingTable).toBe(
      'women',
    );
    expect(stored.scores).toEqual({});
  });

  it('limits completed history to joined guests and clears or anonymizes only the current guest', async () => {
    const aino = await guest('Aino');
    const elli = await guest('Elli');
    const sanni = await guest('Sanni');
    const outsider = await guest('Veera');
    const round = await createRound(aino);
    await joinPreviewRoundHandler(
      requestFor(
        '',
        elli.token,
        { handicapIndex: 18, ratingTable: 'women' },
        {
          invitationToken: round.invitationToken,
        },
      ),
    );
    await joinPreviewRoundHandler(
      requestFor(
        '',
        sanni.token,
        { handicapIndex: 18, ratingTable: 'women' },
        {
          invitationToken: round.invitationToken,
        },
      ),
    );
    const active = previewRoundStore.get(round.id)!;
    const ainoPlayer = active.players[0]!;
    previewRoundStore.updatePlayer({
      roundId: round.id,
      playerId: ainoPlayer.id,
      identityId: aino.subject,
      name: 'Aino',
      handicapIndex: 18,
      teeLabel: '52',
      ratingTable: 'men',
      ready: true,
    });
    const elliPlayer = active.players[1]!;
    previewRoundStore.updatePlayer({
      roundId: round.id,
      playerId: elliPlayer.id,
      identityId: elli.subject,
      name: 'Elli',
      handicapIndex: 18,
      teeLabel: '52',
      ratingTable: 'women',
      ready: true,
    });
    const sanniPlayer = active.players[2]!;
    previewRoundStore.updatePlayer({
      roundId: round.id,
      playerId: sanniPlayer.id,
      identityId: sanni.subject,
      name: 'Sanni',
      handicapIndex: 18,
      teeLabel: '52',
      ratingTable: 'women',
      ready: true,
    });
    previewRoundStore.start(round.id);
    previewRoundStore.score({
      roundId: round.id,
      playerId: ainoPlayer.id,
      holeNumber: 1,
      strokes: 4,
    });
    previewRoundStore.finish(round.id);

    expect(
      (await listCompletedPreviewRoundsHandler(requestFor('', outsider.token))).jsonBody,
    ).toEqual([]);
    expect(
      (await getCompletedPreviewRoundHandler(requestFor(round.id, outsider.token))).status,
    ).toBe(403);
    expect((await getCompletedPreviewRoundHandler(requestFor(round.id, elli.token))).status).toBe(
      200,
    );
    expect((await clearGuestSessionHandler(requestFor('', elli.token))).jsonBody).toEqual({
      cleared: true,
    });
    expect((await getCompletedPreviewRoundHandler(requestFor(round.id, elli.token))).status).toBe(
      401,
    );

    const deleted = await deleteGuestDataHandler(requestFor('', aino.token));
    const visibleToSanni = await getCompletedPreviewRoundHandler(requestFor(round.id, sanni.token));
    expect(deleted.jsonBody).toEqual({ anonymizedRoundCount: 1 });
    expect(visibleToSanni.status).toBe(200);
    expect(previewRoundStore.getHistory(round.id)?.players[0]).toMatchObject({
      identityId: undefined,
      name: 'Poistettu pelaaja',
    });
  });
});
