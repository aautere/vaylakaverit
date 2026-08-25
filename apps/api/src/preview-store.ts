import { randomUUID } from 'node:crypto';
import { allocateRelativeHandicapStrokes, netHoleScore, talmaMaster } from '@vaylakaverit/domain';

type PreviewPlayer = {
  id: string;
  name: string;
  teeLabel: string;
  handicapIndex: number;
};

type PreviewRound = {
  id: string;
  courseName: string;
  joinLink: string;
  players: PreviewPlayer[];
  scores: Record<string, Record<number, number>>;
  game: {
    mode: 'scratch' | 'handicap';
    reward: string;
  };
  standings: {
    completedHoles: number;
    winsByPlayerId: Record<string, number>;
  };
};

const rounds = new Map<string, PreviewRound>();

export function createPreviewRound(
  name: string,
  handicapIndex: number,
  mode: 'scratch' | 'handicap',
  reward: string,
): PreviewRound {
  const id = randomUUID();
  const player = createPlayer(name, handicapIndex);
  const round: PreviewRound = {
    id,
    courseName: talmaMaster.name,
    joinLink: `/join/${id}`,
    players: [player],
    scores: {},
    game: {
      mode,
      reward,
    },
    standings: {
      completedHoles: 0,
      winsByPlayerId: { [player.id]: 0 },
    },
  };

  rounds.set(id, round);
  return round;
}
export function getPreviewRound(roundId: string): PreviewRound | undefined {
  return rounds.get(roundId);
}

function calculateStandings(round: PreviewRound): PreviewRound['standings'] {
  const winsByPlayerId = Object.fromEntries(round.players.map((player) => [player.id, 0]));
  const allocations =
    round.game.mode === 'handicap'
      ? allocateRelativeHandicapStrokes(
          round.players.map((player) => ({
            playerId: player.id,
            playingHandicap: Math.round(player.handicapIndex),
          })),
        ).strokesByPlayerId
      : new Map(round.players.map((player) => [player.id, 0]));

  let completedHoles = 0;

  for (const hole of talmaMaster.holes) {
    const holeScores = round.players.map((player) => ({
      playerId: player.id,
      gross: round.scores[player.id]?.[hole.number],
    }));

    if (holeScores.some((score) => score.gross === undefined)) {
      continue;
    }

    completedHoles += 1;
    const bestScore = Math.min(
      ...holeScores.map((score) =>
        round.game.mode === 'handicap'
          ? netHoleScore(score.gross!, allocations.get(score.playerId) ?? 0, hole.handicapIndex)
          : score.gross!,
      ),
    );
    const winners = holeScores.filter((score) => {
      const scoreForGame =
        round.game.mode === 'handicap'
          ? netHoleScore(score.gross!, allocations.get(score.playerId) ?? 0, hole.handicapIndex)
          : score.gross!;
      return scoreForGame === bestScore;
    });

    if (winners.length === 1) {
      const winnerId = winners[0]!.playerId;
      winsByPlayerId[winnerId] = (winsByPlayerId[winnerId] ?? 0) + 1;
    }
  }

  return { completedHoles, winsByPlayerId };
}

export function joinPreviewRound(
  roundId: string,
  name: string,
  handicapIndex: number,
): PreviewRound | undefined {
  const round = rounds.get(roundId);

  if (!round || !name || round.players.length >= 4) {
    return undefined;
  }

  round.players.push(createPlayer(name, handicapIndex));
  round.standings.winsByPlayerId[round.players.at(-1)!.id] = 0;
  return round;
}

export function recordPreviewScore(
  roundId: string,
  playerId: string,
  holeNumber: number,
  strokes: number,
): PreviewRound | undefined {
  const round = rounds.get(roundId);
  const playerExists = round?.players.some((player) => player.id === playerId);

  if (!round || !playerExists || holeNumber < 1 || holeNumber > 18 || strokes < 1) {
    return undefined;
  }

  const playerScores = round.scores[playerId] ?? {};
  playerScores[holeNumber] = strokes;
  round.scores[playerId] = playerScores;
  round.standings = calculateStandings(round);
  return round;
}

function createPlayer(name: string, handicapIndex: number): PreviewPlayer {
  return {
    id: randomUUID(),
    name,
    teeLabel: talmaMaster.defaultTeeLabel,
    handicapIndex,
  };
}
