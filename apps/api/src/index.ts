import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import { UnavailableAppleTokenVerifier } from './auth/apple.js';
import { readAuthConfig } from './auth/config.js';
import { IdentityService } from './auth/identity.js';
import { readLiveUpdateConfig } from './live-updates/config.js';
import { createRoundUpdateTransport } from './live-updates/round-update-transport.js';
import { createRoundStore } from './store/create-round-store.js';
import { ScoreRevisionConflictError } from './store/round-store.js';

const roundStore = createRoundStore();
const identityService = new IdentityService(readAuthConfig(), new UnavailableAppleTokenVerifier());
const roundUpdateTransport = createRoundUpdateTransport(readLiveUpdateConfig());
const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173';

export async function health(
  _request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    jsonBody: {
      service: 'vaylakaverit-api',
      status: 'ok',
    },
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});

function json(body: unknown, status = 200): HttpResponseInit {
  return {
    status,
    headers: {
      'access-control-allow-origin': webOrigin,
      'access-control-allow-headers': 'authorization,content-type,x-preview-guest-id',
      'content-type': 'application/json',
    },
    jsonBody: body,
  };
}

async function requestBody(request: HttpRequest): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => ({}));

  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

app.http('apiOptions', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: async () => ({
    status: 204,
    headers: {
      'access-control-allow-origin': webOrigin,
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-preview-guest-id',
    },
  }),
});

app.http('createPreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds',
  handler: async (request) => {
    const session = identityService.sessionFromRequest(request);
    if (!session) {
      return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
    }

    const body = await requestBody(request);
    const name = typeof body.name === 'string' ? body.name : '';
    const handicapIndex = typeof body.handicapIndex === 'number' ? body.handicapIndex : 18;
    const teeLabel = typeof body.teeLabel === 'string' ? body.teeLabel : undefined;
    const ratingTable = typeof body.ratingTable === 'string' ? body.ratingTable : undefined;
    const mode = body.mode === 'handicap' ? 'handicap' : 'scratch';
    const reward = typeof body.reward === 'string' ? body.reward : '';
    const holeTieRule = body.holeTieRule === 'carry-forward' ? 'carry-forward' : 'no-winner';
    const endTieRule = body.endTieRule === 'continue' ? 'continue' : 'draw';

    if (!name.trim()) {
      return json({ error: 'Anna pelaajan nimi.' }, 400);
    }

    try {
      return json(
        await roundStore.create({
          identityId: session.subject,
          name: name.trim(),
          handicapIndex,
          teeLabel,
          ratingTable,
          mode,
          reward: reward.trim(),
          holeTieRule,
          endTieRule,
        }),
        201,
      );
    } catch (error) {
      return json({ error: handicapErrorMessage(error) }, 400);
    }
  },
});

app.http('getPreviewRound', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}',
  handler: getPreviewRoundHandler,
});

export async function getPreviewRoundHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  const round = roundId ? await roundStore.get(roundId) : undefined;
  if (!round) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }

  if (!isRoundParticipant(round, session.subject)) {
    return json({ error: 'Liity kierrokseen kutsulinkillä nähdäksesi sen.' }, 403);
  }

  return json(round);
}

app.http('getPreviewInvitation', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'preview/invitations/{invitationToken}',
  handler: getPreviewInvitationHandler,
});

export async function getPreviewInvitationHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const invitationToken = request.params.invitationToken;
  const round = invitationToken
    ? await roundStore.getByInvitationToken(invitationToken)
    : undefined;

  return round
    ? json(round)
    : json({ error: 'Kutsulinkki ei ole voimassa tai kierros on päättynyt.' }, 404);
}

export async function listCompletedPreviewRoundsHandler(
  _request: HttpRequest,
): Promise<HttpResponseInit> {
  return json(await roundStore.history());
}

app.http('listCompletedPreviewRounds', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'preview/completed-rounds',
  handler: listCompletedPreviewRoundsHandler,
});

export async function getCompletedPreviewRoundHandler(
  request: HttpRequest,
): Promise<HttpResponseInit> {
  const roundId = request.params.roundId;
  const round = roundId ? await roundStore.getHistory(roundId) : undefined;
  return round ? json(round) : json({ error: 'Valmista kierrosta ei löytynyt.' }, 404);
}

app.http('getCompletedPreviewRound', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'preview/completed-rounds/{roundId}',
  handler: getCompletedPreviewRoundHandler,
});

export async function completePreviewRoundHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  const existingRound = roundId ? await roundStore.get(roundId) : undefined;
  if (!existingRound) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }

  if (!isRoundParticipant(existingRound, session.subject)) {
    return json({ error: 'Vain kierrokselle liittynyt pelaaja voi päättää kierroksen.' }, 403);
  }

  const round = await roundStore.finish(existingRound.id);
  return round ? json(round) : json({ error: 'Kierrosta ei voitu päättää.' }, 400);
}

app.http('completePreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/complete',
  handler: completePreviewRoundHandler,
});

app.http('joinPreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/invitations/{invitationToken}/join',
  handler: joinPreviewRoundHandler,
});

export async function joinPreviewRoundHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const invitationToken = request.params.invitationToken;
  if (!invitationToken) {
    return json({ error: 'Kutsulinkki ei ole voimassa tai kierros on päättynyt.' }, 404);
  }
  const invitedRound = await roundStore.getByInvitationToken(invitationToken);
  if (!invitedRound) {
    return json({ error: 'Kutsulinkki ei ole voimassa tai kierros on päättynyt.' }, 404);
  }

  const body = await requestBody(request);
  const name = typeof body.name === 'string' ? body.name : '';
  const handicapIndex = typeof body.handicapIndex === 'number' ? body.handicapIndex : 18;
  const teeLabel = typeof body.teeLabel === 'string' ? body.teeLabel : undefined;
  const ratingTable = typeof body.ratingTable === 'string' ? body.ratingTable : undefined;
  let round;
  try {
    round = await roundStore.join({
      roundId: invitedRound.id,
      invitationToken,
      identityId: session.subject,
      name: name.trim(),
      handicapIndex,
      teeLabel,
      ratingTable,
    });
  } catch (error) {
    return json({ error: handicapErrorMessage(error) }, 400);
  }

  if (!round) {
    const currentInvitation = await roundStore.getByInvitationToken(invitationToken);
    if (!currentInvitation) {
      return json({ error: 'Kutsulinkki ei ole enää voimassa.' }, 404);
    }
    if (currentInvitation.players.length >= 4) {
      return json(
        { error: 'Kierros on täynnä. Voit silti katsella kierrosta kutsulinkillä.' },
        409,
      );
    }
    return json({ error: 'Kierrokseen ei voi liittyä.' }, 400);
  }

  await publishRoundUpdate(round.id);
  return json(round);
}

app.http('revokePreviewInvitation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/invitation/revoke',
  handler: revokePreviewInvitationHandler,
});

export async function revokePreviewInvitationHandler(
  request: HttpRequest,
): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  if (!roundId) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }

  const revokedRound = await roundStore.revokeInvitation({
    roundId,
    creatorIdentityId: session.subject,
  });
  if (!revokedRound) {
    return json({ error: 'Vain kierroksen luoja voi mitätöidä voimassa olevan kutsulinkin.' }, 403);
  }

  await publishRoundUpdate(revokedRound.id);
  return json(revokedRound);
}

app.http('updatePreviewRoundPlayer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/players/{playerId}',
  handler: updatePreviewRoundPlayerHandler,
});

export async function updatePreviewRoundPlayerHandler(
  request: HttpRequest,
): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  const playerId = request.params.playerId;
  const round = roundId ? await roundStore.get(roundId) : undefined;
  if (!round) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }
  if (round.state !== 'lobby') {
    return json({ error: 'Pelaaja-asetuksia voi muuttaa vain kierroksen aulassa.' }, 400);
  }

  const player = round.players.find((candidate) => candidate.id === playerId);
  if (!player || player.identityId !== session.subject) {
    return json({ error: 'Voit muuttaa vain omia asetuksiasi.' }, 403);
  }

  const body = await requestBody(request);
  const name = typeof body.name === 'string' ? body.name : '';
  const handicapIndex = typeof body.handicapIndex === 'number' ? body.handicapIndex : Number.NaN;
  const teeLabel = typeof body.teeLabel === 'string' ? body.teeLabel : '';
  const ratingTable = typeof body.ratingTable === 'string' ? body.ratingTable : '';
  const ready = body.ready === true;

  try {
    const updatedRound = await roundStore.updatePlayer({
      roundId: round.id,
      playerId: player.id,
      identityId: session.subject,
      name,
      handicapIndex,
      teeLabel,
      ratingTable,
      ready,
    });
    if (!updatedRound) {
      return json({ error: 'Pelaaja-asetuksia ei voitu tallentaa.' }, 400);
    }

    await publishRoundUpdate(updatedRound.id);
    return json(updatedRound);
  } catch (error) {
    return json({ error: handicapErrorMessage(error) }, 400);
  }
}

app.http('startPreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/start',
  handler: startPreviewRoundHandler,
});

export async function startPreviewRoundHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  const round = roundId ? await roundStore.get(roundId) : undefined;
  if (!round) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }
  if (round.creatorIdentityId !== session.subject) {
    return json({ error: 'Vain kierroksen luoja voi aloittaa kierroksen.' }, 403);
  }

  const startedRound = await roundStore.start(round.id);
  if (!startedRound) {
    return json(
      {
        error:
          'Kierros voidaan aloittaa, kun 2–4 pelaajaa on liittynyt ja kaikki ovat vahvistaneet asetuksensa.',
      },
      400,
    );
  }

  await publishRoundUpdate(startedRound.id);
  return json(startedRound);
}

export async function recordPreviewScoreHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const body = await requestBody(request);
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  const holeNumber = typeof body.holeNumber === 'number' ? body.holeNumber : 0;
  const strokes = typeof body.strokes === 'number' ? body.strokes : 0;
  const changeId = typeof body.changeId === 'string' ? body.changeId : undefined;
  const expectedRevision =
    typeof body.expectedRevision === 'number' ? body.expectedRevision : undefined;
  const roundId = request.params.roundId;
  if (!roundId) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }
  if (
    expectedRevision === undefined ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0
  ) {
    return json({ error: 'Päivitä kierros ennen tuloksen tallentamista.' }, 400);
  }

  const round = await roundStore.get(roundId);

  if (!round) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }

  if (
    !round.players.some((player) => player.id === playerId && player.identityId === session.subject)
  ) {
    return json({ error: 'Voit tallentaa vain oman tuloksesi.' }, 403);
  }

  let updatedRound;
  try {
    updatedRound = await roundStore.score({
      roundId,
      playerId,
      holeNumber,
      strokes,
      changeId,
      expectedRevision,
    });
  } catch (error) {
    if (error instanceof ScoreRevisionConflictError) {
      return json(
        {
          error: 'Tulos on muuttunut toisessa laitteessa. Tarkista nykyinen tulos ennen korjausta.',
          currentRevision: error.currentRevision,
          round: await roundStore.get(roundId),
        },
        409,
      );
    }
    throw error;
  }
  if (!updatedRound) {
    return json({ error: 'Tulosta ei voitu tallentaa.' }, 400);
  }

  await publishRoundUpdate(updatedRound.id);
  return json(updatedRound);
}

app.http('recordPreviewScore', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/scores',
  handler: recordPreviewScoreHandler,
});

app.http('signInWithApple', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/apple',
  handler: async (request) => {
    const body = await requestBody(request);
    const identityToken = typeof body.identityToken === 'string' ? body.identityToken : '';

    if (!identityToken) {
      return json({ error: 'Apple identity token is required.' }, 400);
    }

    try {
      return json(await identityService.signInWithApple(identityToken));
    } catch {
      return json({ error: 'Sign in with Apple is not configured for this environment.' }, 501);
    }
  },
});

app.http('deleteAccount', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'account',
  handler: deleteAccountHandler,
});

export async function deleteAccountHandler(request: HttpRequest): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const result = await roundStore.deleteIdentity(session.subject);
  return json(result);
}

app.http('addPreviewSideGame', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/side-games',
  handler: async (request) => {
    const session = identityService.sessionFromRequest(request);
    if (!session) {
      return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
    }

    const body = await requestBody(request);
    const roundId = request.params.roundId;
    const startHole = typeof body.startHole === 'number' ? body.startHole : 0;
    const holeCount = typeof body.holeCount === 'number' ? body.holeCount : 0;
    const mode = body.mode === 'handicap' ? 'handicap' : 'scratch';
    const reward = typeof body.reward === 'string' ? body.reward : '';
    const holeTieRule = body.holeTieRule === 'carry-forward' ? 'carry-forward' : 'no-winner';
    const carryEligiblePlayerIds = Array.isArray(body.carryEligiblePlayerIds)
      ? body.carryEligiblePlayerIds.filter(
          (playerId): playerId is string => typeof playerId === 'string',
        )
      : [];
    const playerIds = Array.isArray(body.playerIds)
      ? body.playerIds.filter((playerId): playerId is string => typeof playerId === 'string')
      : undefined;
    const endTieRule = body.endTieRule === 'continue' ? 'continue' : 'draw';
    const existingRound = roundId ? await roundStore.get(roundId) : undefined;
    if (!existingRound) {
      return json({ error: 'Kierrosta ei löytynyt.' }, 404);
    }

    if (!isRoundParticipant(existingRound, session.subject)) {
      return json({ error: 'Vain kierrokselle liittynyt pelaaja voi lisätä sivupelin.' }, 403);
    }

    const round = await roundStore.addSideGame({
      roundId: existingRound.id,
      startHole,
      holeCount,
      mode,
      reward,
      playerIds,
      holeTieRule,
      carryEligiblePlayerIds,
      endTieRule,
    });

    if (!round) {
      return json({ error: 'Sivupeliä ei voitu lisätä.' }, 400);
    }

    await publishRoundUpdate(round.id);
    return json(round, 201);
  },
});

app.http('getRoundLiveConnection', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'rounds/{roundId}/live-connection',
  handler: getRoundLiveConnectionHandler,
});

export async function getRoundLiveConnectionHandler(
  request: HttpRequest,
): Promise<HttpResponseInit> {
  const session = identityService.sessionFromRequest(request);
  if (!session) {
    return json({ error: 'Tunnistautuminen vaaditaan.' }, 401);
  }

  const roundId = request.params.roundId;
  const round = roundId ? await roundStore.get(roundId) : undefined;
  if (!round) {
    return json({ error: 'Kierrosta ei löytynyt.' }, 404);
  }

  if (!isRoundParticipant(round, session.subject)) {
    return json({ error: 'Vain kierrokselle liittynyt pelaaja voi kuunnella päivityksiä.' }, 403);
  }

  return json(await roundUpdateTransport.createConnection(round.id, session.subject));
}

function isRoundParticipant(
  round: { players: Array<{ identityId?: string }> },
  identityId: string,
): boolean {
  return round.players.some((player) => player.identityId === identityId);
}

function handicapErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Pelitasoitusta ei voitu määrittää.';
}

async function publishRoundUpdate(roundId: string): Promise<void> {
  try {
    await roundUpdateTransport.publish(roundId);
  } catch {
    // A persisted update is still recoverable through the snapshot endpoint and polling fallback.
  }
}
