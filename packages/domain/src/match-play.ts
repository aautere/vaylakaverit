export type HoleTieRule = 'no-winner' | 'carry-forward';
export type EndTieRule = 'draw' | 'continue';

export type MatchPlaySettings = {
  holeTieRule: HoleTieRule;
  carryEligiblePlayerIds: string[];
  endTieRule: EndTieRule;
};

export type MatchPlayHole = {
  number: number;
  scoresByPlayerId: Record<string, number | undefined>;
};

export type MatchPlayHoleResult = {
  holeNumber: number;
  kind: 'winner' | 'tie';
  winnerId?: string;
  winsAwarded: number;
  carriedWinsAfterHole: number;
};

export type MatchPlayOutcome =
  | { kind: 'winner'; playerIds: [string]; wins: number }
  | { kind: 'draw'; playerIds: string[]; wins: number }
  | { kind: 'unresolved'; playerIds: []; wins: 0 };

export type MatchPlayStanding = {
  completedHoles: number;
  winsByPlayerId: Record<string, number>;
  holeResults: MatchPlayHoleResult[];
  carriedWins: number;
  status: 'active' | 'winner' | 'draw' | 'extension' | 'unresolved';
  outcome?: MatchPlayOutcome;
};

export type EvaluateMatchPlayInput = {
  playerIds: string[];
  holes: MatchPlayHole[];
  startHole: number;
  holeCount: number;
  settings: MatchPlaySettings;
  roundFinished?: boolean;
};

/**
 * Evaluates a shared match-play game from scores that have already had any handicap adjustment
 * applied. A carried win remains outstanding until an eligible player wins a later hole.
 */
export function evaluateMatchPlay({
  playerIds,
  holes,
  startHole,
  holeCount,
  settings,
  roundFinished = false,
}: EvaluateMatchPlayInput): MatchPlayStanding {
  const winsByPlayerId = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
  const holeResults: MatchPlayHoleResult[] = [];
  const endHole = startHole + holeCount - 1;
  let carriedWins = 0;
  let primaryRangeComplete = true;

  for (const holeNumber of range(startHole, endHole)) {
    const hole = holes.find((candidate) => candidate.number === holeNumber);
    if (!hole || !hasScoresForEveryPlayer(hole, playerIds)) {
      primaryRangeComplete = false;
      continue;
    }

    carriedWins = evaluateHole(hole, playerIds, settings, winsByPlayerId, carriedWins, holeResults);
  }

  if (!primaryRangeComplete) {
    return standing('active');
  }

  let currentStatus: MatchPlayStanding['status'];
  if (carriedWins > 0) {
    currentStatus = 'extension';
  } else {
    const leaders = leadersOf(winsByPlayerId);
    currentStatus =
      leaders.length === 1 ? 'winner' : settings.endTieRule === 'draw' ? 'draw' : 'extension';
  }

  if (currentStatus === 'extension') {
    for (const holeNumber of range(endHole + 1, 18)) {
      const hole = holes.find((candidate) => candidate.number === holeNumber);
      if (!hole || !hasScoresForEveryPlayer(hole, playerIds)) {
        break;
      }

      carriedWins = evaluateHole(
        hole,
        playerIds,
        settings,
        winsByPlayerId,
        carriedWins,
        holeResults,
      );

      if (carriedWins === 0 && leadersOf(winsByPlayerId).length === 1) {
        currentStatus = 'winner';
        break;
      }
    }
  }

  if (roundFinished && currentStatus === 'extension') {
    currentStatus = 'unresolved';
  }

  return standing(currentStatus);

  function standing(status: MatchPlayStanding['status']): MatchPlayStanding {
    const leaders = leadersOf(winsByPlayerId);
    const wins = leaders.length > 0 ? (winsByPlayerId[leaders[0]!] ?? 0) : 0;
    const outcome: MatchPlayOutcome | undefined =
      status === 'winner'
        ? { kind: 'winner' as const, playerIds: [leaders[0]!] as [string], wins }
        : status === 'draw'
          ? { kind: 'draw' as const, playerIds: leaders, wins }
          : status === 'unresolved'
            ? { kind: 'unresolved' as const, playerIds: [] as [], wins: 0 }
            : undefined;

    return {
      completedHoles: holeResults.length,
      winsByPlayerId,
      holeResults,
      carriedWins,
      status,
      outcome,
    };
  }
}

function evaluateHole(
  hole: MatchPlayHole,
  playerIds: string[],
  settings: MatchPlaySettings,
  winsByPlayerId: Record<string, number>,
  carriedWins: number,
  holeResults: MatchPlayHoleResult[],
): number {
  const eligiblePlayerIds = carriedWins > 0 ? settings.carryEligiblePlayerIds : playerIds;
  const bestScore = Math.min(
    ...eligiblePlayerIds.map((playerId) => hole.scoresByPlayerId[playerId]!),
  );
  const winners = eligiblePlayerIds.filter(
    (playerId) => hole.scoresByPlayerId[playerId] === bestScore,
  );

  if (winners.length === 1) {
    const winnerId = winners[0]!;
    const winsAwarded = carriedWins + 1;
    winsByPlayerId[winnerId] = (winsByPlayerId[winnerId] ?? 0) + winsAwarded;
    holeResults.push({
      holeNumber: hole.number,
      kind: 'winner',
      winnerId,
      winsAwarded,
      carriedWinsAfterHole: 0,
    });
    return 0;
  }

  const carriedWinsAfterHole =
    settings.holeTieRule === 'carry-forward' ? carriedWins + 1 : carriedWins;
  holeResults.push({
    holeNumber: hole.number,
    kind: 'tie',
    winsAwarded: 0,
    carriedWinsAfterHole,
  });
  return carriedWinsAfterHole;
}

function hasScoresForEveryPlayer(hole: MatchPlayHole, playerIds: string[]): boolean {
  return playerIds.every((playerId) => hole.scoresByPlayerId[playerId] !== undefined);
}

function leadersOf(winsByPlayerId: Record<string, number>): string[] {
  const highestWins = Math.max(...Object.values(winsByPlayerId));
  return Object.entries(winsByPlayerId)
    .filter(([, wins]) => wins === highestWins)
    .map(([playerId]) => playerId);
}

function range(start: number, end: number): number[] {
  return end >= start ? Array.from({ length: end - start + 1 }, (_, index) => start + index) : [];
}
