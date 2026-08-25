import { randomBytes, randomUUID } from 'node:crypto';
import {
  allocateRelativeHandicapStrokes,
  evaluateMatchPlay,
  isRatingTable,
  isTeeLabel,
  lookupTalmaMasterPlayingHandicap,
  netHoleScore,
  talmaMaster,
  type EndTieRule,
  type HoleTieRule,
  type MatchPlayOutcome,
  type MatchPlaySettings,
  type MatchPlayStanding,
  type RatingTable,
  type TeeLabel,
} from '@vaylakaverit/domain';

export type { EndTieRule, HoleTieRule };
export type GameMode = 'scratch' | 'handicap';

export type RoundPlayer = {
  id: string;
  identityId?: string;
  name: string;
  teeLabel: TeeLabel;
  ratingTable: RatingTable;
  handicapIndex: number;
  playingHandicap: number;
  ready: boolean;
};

export type Game = MatchPlaySettings & {
  id?: string;
  participantIds: string[];
  startHole: number;
  holeCount: number;
  mode: GameMode;
  reward: string;
  standings: MatchPlayStanding;
};

export type FullRoundGameInput = {
  mode: GameMode;
  reward: string;
  holeTieRule?: HoleTieRule;
  carryEligiblePlayerIds?: string[];
  endTieRule?: EndTieRule;
};

export type RoundState = 'lobby' | 'active';

export type Round = {
  id: string;
  courseName: string;
  joinLink: string;
  invitationToken: string;
  invitationExpiresAt: string;
  invitationRevokedAt?: string;
  state: RoundState;
  creatorIdentityId?: string;
  players: RoundPlayer[];
  scores: Record<string, Record<number, number>>;
  scoreRevisions: Record<string, Record<number, number>>;
  game: Game;
  games?: Game[];
  standings: MatchPlayStanding;
  sideGames: Game[];
};

export type CompletedRound = Round & {
  completedAt: string;
  outcome: MatchPlayOutcome;
};

export type CreateRoundInput = {
  identityId: string;
  name: string;
  handicapIndex: number;
  teeLabel?: string;
  ratingTable?: string;
  mode: GameMode;
  reward: string;
  holeTieRule?: HoleTieRule;
  carryEligiblePlayerIds?: string[];
  endTieRule?: EndTieRule;
  games?: FullRoundGameInput[];
};

export type JoinRoundInput = {
  roundId: string;
  invitationToken: string;
  identityId: string;
  name: string;
  handicapIndex: number;
  teeLabel?: string;
  ratingTable?: string;
};

export type ScoreRoundInput = {
  roundId: string;
  playerId: string;
  holeNumber: number;
  strokes: number;
  changeId?: string;
  expectedRevision?: number;
};

export type UpdateRoundPlayerInput = {
  roundId: string;
  playerId: string;
  identityId: string;
  name: string;
  handicapIndex: number;
  teeLabel: string;
  ratingTable: string;
  ready: boolean;
};

export type AddSideGameInput = {
  roundId: string;
  startHole: number;
  holeCount: number;
  mode: GameMode;
  reward: string;
  playerIds?: string[];
  holeTieRule?: HoleTieRule;
  carryEligiblePlayerIds?: string[];
  endTieRule?: EndTieRule;
};

export type RevokeInvitationInput = {
  roundId: string;
  creatorIdentityId: string;
};

export type DeleteIdentityResult = {
  anonymizedRoundCount: number;
};

type MaybePromise<Value> = Value | Promise<Value>;

/**
 * Persistence boundary for the round API. Implementations may be synchronous for local preview or
 * asynchronous for a remote data store; API handlers always await its operations.
 */
export interface RoundStore {
  create(input: CreateRoundInput): MaybePromise<Round>;
  get(roundId: string): MaybePromise<Round | undefined>;
  getByInvitationToken(invitationToken: string): MaybePromise<Round | undefined>;
  revokeInvitation(input: RevokeInvitationInput): MaybePromise<Round | undefined>;
  join(input: JoinRoundInput): MaybePromise<Round | undefined>;
  updatePlayer(input: UpdateRoundPlayerInput): MaybePromise<Round | undefined>;
  start(roundId: string): MaybePromise<Round | undefined>;
  score(input: ScoreRoundInput): MaybePromise<Round | undefined>;
  addSideGame(input: AddSideGameInput): MaybePromise<Round | undefined>;
  finish(roundId: string): MaybePromise<CompletedRound | undefined>;
  history(): MaybePromise<CompletedRound[]>;
  getHistory(roundId: string): MaybePromise<CompletedRound | undefined>;
  deleteIdentity(identityId: string): MaybePromise<DeleteIdentityResult>;
}

export const invitationLifetimeMilliseconds = 24 * 60 * 60 * 1000;

export function createRound(input: CreateRoundInput, now = new Date()): Round {
  const id = randomUUID();
  const invitationToken = randomBytes(32).toString('base64url');
  const player = createPlayer(
    input.identityId,
    input.name,
    input.handicapIndex,
    input.teeLabel,
    input.ratingTable,
  );
  const games = (
    input.games ?? [
      {
        mode: input.mode,
        reward: input.reward,
        holeTieRule: input.holeTieRule,
        carryEligiblePlayerIds: input.carryEligiblePlayerIds,
        endTieRule: input.endTieRule,
      },
    ]
  ).map((gameInput) =>
    createGame({
      startHole: 1,
      holeCount: 18,
      mode: gameInput.mode,
      reward: gameInput.reward,
      participantIds: [],
      holeTieRule: gameInput.holeTieRule ?? 'no-winner',
      carryEligiblePlayerIds: gameInput.carryEligiblePlayerIds ?? [player.id],
      endTieRule: gameInput.endTieRule ?? 'draw',
    }),
  );
  const game = games[0];
  if (!game) {
    throw new Error('At least one full-round game is required.');
  }

  const round: Round = {
    id,
    courseName: talmaMaster.name,
    joinLink: `/?join=${invitationToken}`,
    invitationToken,
    invitationExpiresAt: new Date(now.getTime() + invitationLifetimeMilliseconds).toISOString(),
    state: 'lobby',
    creatorIdentityId: input.identityId,
    players: [player],
    scores: {},
    scoreRevisions: {},
    game,
    games,
    standings: game.standings,
    sideGames: [],
  };
  recalculateGames(round);
  return round;
}

export function isInvitationValid(
  round: Pick<Round, 'invitationExpiresAt' | 'invitationRevokedAt'>,
  now = new Date(),
): boolean {
  return (
    !round.invitationRevokedAt &&
    Number.isFinite(Date.parse(round.invitationExpiresAt)) &&
    Date.parse(round.invitationExpiresAt) > now.getTime()
  );
}

export function revokeInvitation(
  round: Round,
  input: RevokeInvitationInput,
  now = new Date(),
): Round | undefined {
  if (
    round.id !== input.roundId ||
    round.creatorIdentityId !== input.creatorIdentityId ||
    !isInvitationValid(round, now)
  ) {
    return undefined;
  }

  round.invitationRevokedAt = now.toISOString();
  return round;
}

export function joinRound(round: Round, input: JoinRoundInput): Round | undefined {
  if (
    round.state !== 'lobby' ||
    round.invitationToken !== input.invitationToken ||
    !isInvitationValid(round) ||
    !input.name ||
    round.players.length >= 4 ||
    round.players.some((player) => player.identityId === input.identityId)
  ) {
    return undefined;
  }

  round.players.push(
    createPlayer(
      input.identityId,
      input.name,
      input.handicapIndex,
      input.teeLabel,
      input.ratingTable,
    ),
  );
  recalculateGames(round);
  return round;
}

export function updateRoundPlayer(round: Round, input: UpdateRoundPlayerInput): Round | undefined {
  if (round.state !== 'lobby') {
    return undefined;
  }

  const player = round.players.find((candidate) => candidate.id === input.playerId);
  if (!player || player.identityId !== input.identityId) {
    return undefined;
  }

  const updatedPlayer = createPlayer(
    player.identityId,
    input.name,
    input.handicapIndex,
    input.teeLabel,
    input.ratingTable,
  );
  Object.assign(player, {
    name: updatedPlayer.name,
    teeLabel: updatedPlayer.teeLabel,
    ratingTable: updatedPlayer.ratingTable,
    handicapIndex: updatedPlayer.handicapIndex,
    playingHandicap: updatedPlayer.playingHandicap,
    ready: input.ready,
  });
  return round;
}

export function startRound(round: Round): Round | undefined {
  if (!isRoundReady(round)) {
    return undefined;
  }

  for (const game of fullRoundGames(round)) {
    game.participantIds = round.players.map((player) => player.id);
  }
  round.state = 'active';
  recalculateGames(round);
  return round;
}

export function isRoundReady(round: Round): boolean {
  return (
    round.state === 'lobby' &&
    round.players.length >= 2 &&
    round.players.length <= 4 &&
    round.players.every(hasValidRequiredSettings) &&
    fullRoundGames(round).every((game) => isFullRoundGameValid(round, game))
  );
}

export function scoreRound(
  round: Round,
  input: ScoreRoundInput,
  processedChangeIds: Set<string>,
): Round | undefined {
  const playerExists = round.players.some((player) => player.id === input.playerId);

  if (
    round.state !== 'active' ||
    !playerExists ||
    !Number.isInteger(input.holeNumber) ||
    !Number.isInteger(input.strokes) ||
    input.holeNumber < 1 ||
    input.holeNumber > 18 ||
    input.strokes < 1
  ) {
    return undefined;
  }

  if (input.changeId && processedChangeIds.has(input.changeId)) {
    return round;
  }

  round.scoreRevisions ??= {};
  const currentRevision = round.scoreRevisions[input.playerId]?.[input.holeNumber] ?? 0;
  if (
    input.expectedRevision !== undefined &&
    (!Number.isInteger(input.expectedRevision) ||
      input.expectedRevision < 0 ||
      input.expectedRevision !== currentRevision)
  ) {
    throw new ScoreRevisionConflictError(currentRevision);
  }

  const playerScores = round.scores[input.playerId] ?? {};
  playerScores[input.holeNumber] = input.strokes;
  round.scores[input.playerId] = playerScores;
  const playerRevisions = round.scoreRevisions[input.playerId] ?? {};
  playerRevisions[input.holeNumber] = currentRevision + 1;
  round.scoreRevisions[input.playerId] = playerRevisions;
  recalculateGames(round);
  if (input.changeId) {
    processedChangeIds.add(input.changeId);
  }
  return round;
}

export function addSideGame(round: Round, input: AddSideGameInput): Round | undefined {
  const participantIds = input.playerIds ?? round.players.map((player) => player.id);
  if (
    round.state !== 'active' ||
    !Number.isInteger(input.startHole) ||
    !Number.isInteger(input.holeCount) ||
    input.startHole < 1 ||
    input.startHole > 18 ||
    input.holeCount < 1 ||
    input.startHole + input.holeCount > 19 ||
    input.startHole !== nextUpcomingHole(round) ||
    !isGameSettingsValid(round, { ...input, playerIds: participantIds })
  ) {
    return undefined;
  }

  const game = createGame({
    id: randomUUID(),
    startHole: input.startHole,
    holeCount: input.holeCount,
    mode: input.mode,
    reward: input.reward,
    participantIds,
    holeTieRule: input.holeTieRule ?? 'no-winner',
    carryEligiblePlayerIds: input.carryEligiblePlayerIds ?? [],
    endTieRule: input.endTieRule ?? 'draw',
  });
  round.sideGames.push(game);
  recalculateGames(round);
  return round;
}

export function finishRound(round: Round, completedAt = new Date().toISOString()): CompletedRound {
  recalculateGames(round, true);
  const outcome = round.game.standings.outcome ?? fallbackOutcome(round.game.standings);

  return {
    ...structuredClone(round),
    completedAt,
    outcome,
  };
}

export function anonymizeIdentity(round: Round, identityId: string): boolean {
  let changed = false;

  if (round.creatorIdentityId === identityId) {
    round.creatorIdentityId = undefined;
    changed = true;
  }

  for (const player of round.players) {
    if (player.identityId === identityId) {
      player.identityId = undefined;
      player.name = 'Poistettu pelaaja';
      player.ready = false;
      changed = true;
    }
  }

  return changed;
}

export function calculateStandings(round: Round): MatchPlayStanding {
  return calculateGameStanding(round, primaryFullRoundGame(round));
}

function recalculateGames(round: Round, roundFinished = false): void {
  const games = fullRoundGames(round);
  for (const game of games) {
    game.standings = calculateGameStanding(round, game, roundFinished);
  }
  round.game = games[0]!;
  round.standings = round.game.standings;
  for (const game of round.sideGames) {
    game.standings = calculateGameStanding(round, game, roundFinished);
  }
}

function calculateGameStanding(
  round: Round,
  game: Pick<Game, 'startHole' | 'holeCount' | 'mode' | 'participantIds'> & MatchPlaySettings,
  roundFinished = false,
): MatchPlayStanding {
  const players = gameParticipants(round, game);
  const allocations =
    game.mode === 'handicap' && players.length > 1
      ? allocateRelativeHandicapStrokes(
          players.map((player) => ({
            playerId: player.id,
            playingHandicap: player.playingHandicap,
          })),
        ).strokesByPlayerId
      : new Map(players.map((player) => [player.id, 0]));

  return evaluateMatchPlay({
    playerIds: players.map((player) => player.id),
    holes: talmaMaster.holes.map((hole) => ({
      number: hole.number,
      scoresByPlayerId: Object.fromEntries(
        players.map((player) => [
          player.id,
          scoreForGame(round, player.id, hole.number, hole.handicapIndex, game.mode, allocations),
        ]),
      ),
    })),
    startHole: game.startHole,
    holeCount: game.holeCount,
    settings: game,
    roundFinished,
  });
}

function scoreForGame(
  round: Round,
  playerId: string,
  holeNumber: number,
  handicapIndex: number,
  mode: GameMode,
  allocations: ReadonlyMap<string, number>,
): number | undefined {
  const gross = round.scores[playerId]?.[holeNumber];
  if (gross === undefined) {
    return undefined;
  }
  return mode === 'handicap'
    ? netHoleScore(gross, allocations.get(playerId) ?? 0, handicapIndex)
    : gross;
}

function createGame(input: Omit<Game, 'standings'>): Game {
  return {
    ...input,
    standings: emptyStanding(),
  };
}

function emptyStanding(): MatchPlayStanding {
  return {
    completedHoles: 0,
    winsByPlayerId: {},
    holeResults: [],
    carriedWins: 0,
    status: 'active',
  };
}

function isGameSettingsValid(
  round: Round,
  input: Pick<AddSideGameInput, 'holeTieRule' | 'carryEligiblePlayerIds' | 'playerIds'>,
): boolean {
  const participantIds = input.playerIds ?? round.players.map((player) => player.id);
  if (
    participantIds.length < 2 ||
    new Set(participantIds).size !== participantIds.length ||
    !participantIds.every((playerId) => round.players.some((player) => player.id === playerId))
  ) {
    return false;
  }

  const holeTieRule = input.holeTieRule ?? 'no-winner';
  if (holeTieRule === 'no-winner') {
    return true;
  }
  if (holeTieRule !== 'carry-forward') {
    return false;
  }

  return (
    (input.carryEligiblePlayerIds?.length ?? 0) > 0 &&
    input.carryEligiblePlayerIds!.every((playerId) => participantIds.includes(playerId))
  );
}

function isFullRoundGameValid(round: Round, game: Game): boolean {
  return (
    game.startHole === 1 &&
    game.holeCount === 18 &&
    (game.mode === 'scratch' || game.mode === 'handicap') &&
    typeof game.reward === 'string' &&
    (game.holeTieRule === 'no-winner' || game.holeTieRule === 'carry-forward') &&
    (game.endTieRule === 'draw' || game.endTieRule === 'continue') &&
    isGameSettingsValid(round, game)
  );
}

function fullRoundGames(round: Round): Game[] {
  if (!round.games || round.games.length === 0) {
    round.games = [round.game];
  }
  return round.games;
}

function primaryFullRoundGame(round: Round): Game {
  return fullRoundGames(round)[0]!;
}

function gameParticipants(round: Round, game: Pick<Game, 'participantIds'>): RoundPlayer[] {
  const participantIds =
    game.participantIds?.length > 0
      ? game.participantIds
      : round.players.map((player) => player.id);
  return participantIds
    .map((playerId) => round.players.find((player) => player.id === playerId))
    .filter((player): player is RoundPlayer => player !== undefined);
}

export function nextUpcomingHole(round: Round): number | undefined {
  const scoredHoleNumbers = Object.values(round.scores).flatMap((scores) =>
    Object.keys(scores).map(Number),
  );
  const lastPlayedHole = Math.max(0, ...scoredHoleNumbers);
  return lastPlayedHole < 18 ? lastPlayedHole + 1 : undefined;
}

export class ScoreRevisionConflictError extends Error {
  public constructor(public readonly currentRevision: number) {
    super('Score revision conflict.');
    this.name = 'ScoreRevisionConflictError';
  }
}

function hasValidRequiredSettings(player: RoundPlayer): boolean {
  if (
    !player.name.trim() ||
    !Number.isFinite(player.handicapIndex) ||
    !isTeeLabel(player.teeLabel) ||
    !isRatingTable(player.ratingTable) ||
    !player.ready
  ) {
    return false;
  }

  try {
    return (
      player.playingHandicap ===
      lookupTalmaMasterPlayingHandicap(player.teeLabel, player.ratingTable, player.handicapIndex)
    );
  } catch {
    return false;
  }
}

function fallbackOutcome(standings: MatchPlayStanding): MatchPlayOutcome {
  const entries = Object.entries(standings.winsByPlayerId);
  if (entries.length === 0) {
    return { kind: 'draw', playerIds: [], wins: 0 };
  }

  const highestWins = Math.max(...entries.map(([, wins]) => wins));
  const playerIds = entries
    .filter(([, wins]) => wins === highestWins)
    .map(([playerId]) => playerId);
  return playerIds.length === 1
    ? { kind: 'winner', playerIds: [playerIds[0]!] as [string], wins: highestWins }
    : { kind: 'draw', playerIds, wins: highestWins };
}

function createPlayer(
  identityId: string,
  name: string,
  handicapIndex: number,
  teeLabel: string = talmaMaster.defaultTeeLabel,
  ratingTable: string = 'men',
): RoundPlayer {
  if (!isTeeLabel(teeLabel)) {
    throw new Error('Valitse Golf Talma Masterin virallinen tii.');
  }
  if (!isRatingTable(ratingTable)) {
    throw new Error('Valitse miesten tai naisten virallinen tasoitustaulukko.');
  }
  if (!name.trim()) {
    throw new Error('Anna pelaajan nimi.');
  }
  if (!Number.isFinite(handicapIndex)) {
    throw new Error('Anna kelvollinen tasoitusindeksi.');
  }

  return {
    id: randomUUID(),
    identityId,
    name: name.trim(),
    teeLabel,
    ratingTable,
    handicapIndex,
    playingHandicap: lookupTalmaMasterPlayingHandicap(teeLabel, ratingTable, handicapIndex),
    ready: false,
  };
}
