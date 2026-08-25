import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';
import {
  createPreviewRound,
  getPreviewRound,
  joinPreviewRound,
  recordPreviewScore,
} from './preview-store.js';

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
      'access-control-allow-origin': 'http://127.0.0.1:5173',
      'content-type': 'application/json',
    },
    jsonBody: body,
  };
}

async function requestBody(request: HttpRequest): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => ({}));

  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

app.http('previewOptions', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: 'preview/{*path}',
  handler: async () => ({
    status: 204,
    headers: {
      'access-control-allow-origin': 'http://127.0.0.1:5173',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  }),
});

app.http('createPreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds',
  handler: async (request) => {
    const body = await requestBody(request);
    const name = typeof body.name === 'string' ? body.name : '';
    const handicapIndex = typeof body.handicapIndex === 'number' ? body.handicapIndex : 18;
    const mode = body.mode === 'handicap' ? 'handicap' : 'scratch';
    const reward = typeof body.reward === 'string' ? body.reward : '';

    if (!name.trim()) {
      return json({ error: 'Anna pelaajan nimi.' }, 400);
    }

    return json(createPreviewRound(name.trim(), handicapIndex, mode, reward.trim()), 201);
  },
});

app.http('getPreviewRound', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}',
  handler: async (request) => {
    const roundId = request.params.roundId;
    const round = roundId ? getPreviewRound(roundId) : undefined;
    return round ? json(round) : json({ error: 'Kierrosta ei löytynyt.' }, 404);
  },
});

app.http('joinPreviewRound', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/join',
  handler: async (request) => {
    const body = await requestBody(request);
    const name = typeof body.name === 'string' ? body.name : '';
    const handicapIndex = typeof body.handicapIndex === 'number' ? body.handicapIndex : 18;
    const roundId = request.params.roundId;
    const round = roundId ? joinPreviewRound(roundId, name.trim(), handicapIndex) : undefined;

    return round ? json(round) : json({ error: 'Kierrokseen ei voi liittyä.' }, 400);
  },
});

app.http('recordPreviewScore', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'preview/rounds/{roundId}/scores',
  handler: async (request) => {
    const body = await requestBody(request);
    const playerId = typeof body.playerId === 'string' ? body.playerId : '';
    const holeNumber = typeof body.holeNumber === 'number' ? body.holeNumber : 0;
    const strokes = typeof body.strokes === 'number' ? body.strokes : 0;
    const roundId = request.params.roundId;
    const round = roundId ? recordPreviewScore(roundId, playerId, holeNumber, strokes) : undefined;

    return round ? json(round) : json({ error: 'Tulosta ei voitu tallentaa.' }, 400);
  },
});
