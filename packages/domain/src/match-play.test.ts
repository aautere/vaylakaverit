import { describe, expect, it } from 'vitest';
import { evaluateMatchPlay } from './match-play.js';

const players = ['aino', 'elli'];

function evaluate(
  scores: Array<[number, number, number]>,
  settings: Partial<Parameters<typeof evaluateMatchPlay>[0]['settings']> = {},
  roundFinished = false,
) {
  return evaluateMatchPlay({
    playerIds: players,
    holes: scores.map(([number, aino, elli]) => ({
      number,
      scoresByPlayerId: { aino, elli },
    })),
    startHole: 1,
    holeCount: 2,
    settings: {
      holeTieRule: 'no-winner',
      carryEligiblePlayerIds: players,
      endTieRule: 'draw',
      ...settings,
    },
    roundFinished,
  });
}

describe('evaluateMatchPlay', () => {
  it('awards no winner for a tied hole when configured', () => {
    const standing = evaluate([
      [1, 4, 4],
      [2, 4, 5],
    ]);

    expect(standing.winsByPlayerId).toEqual({ aino: 1, elli: 0 });
    expect(standing.holeResults[0]).toMatchObject({ kind: 'tie', carriedWinsAfterHole: 0 });
  });

  it('carries a tied win and lets only selected players resolve it', () => {
    const standing = evaluate(
      [
        [1, 4, 4],
        [2, 3, 5],
      ],
      { holeTieRule: 'carry-forward', carryEligiblePlayerIds: ['elli'] },
    );

    expect(standing.winsByPlayerId).toEqual({ aino: 0, elli: 2 });
    expect(standing.holeResults[1]).toMatchObject({
      winnerId: 'elli',
      winsAwarded: 2,
    });
  });

  it('records a draw or continues after an end tie as configured', () => {
    const draw = evaluate([
      [1, 4, 5],
      [2, 5, 4],
    ]);
    const continuation = evaluate(
      [
        [1, 4, 5],
        [2, 5, 4],
      ],
      { endTieRule: 'continue' },
    );

    expect(draw).toMatchObject({ status: 'draw', outcome: { kind: 'draw' } });
    expect(continuation).toMatchObject({ status: 'extension' });
  });

  it('resolves an extension one hole at a time or marks it unresolved when the round ends', () => {
    const resolved = evaluate(
      [
        [1, 4, 5],
        [2, 5, 4],
        [3, 4, 5],
      ],
      { endTieRule: 'continue' },
    );
    const unresolved = evaluate(
      [
        [1, 4, 5],
        [2, 5, 4],
      ],
      { endTieRule: 'continue' },
      true,
    );

    expect(resolved).toMatchObject({ status: 'winner', outcome: { playerIds: ['aino'] } });
    expect(unresolved).toMatchObject({ status: 'unresolved', outcome: { kind: 'unresolved' } });
  });

  it('does not extend a completed nine-hole round beyond its configured range', () => {
    const standing = evaluateMatchPlay({
      playerIds: players,
      holes: Array.from({ length: 9 }, (_, index) => ({
        number: index + 1,
        scoresByPlayerId: {
          aino: 4,
          elli: 4,
        },
      })),
      startHole: 1,
      holeCount: 8,
      roundHoleCount: 9,
      settings: {
        holeTieRule: 'no-winner',
        carryEligiblePlayerIds: players,
        endTieRule: 'continue',
      },
      roundFinished: true,
    });

    expect(standing).toMatchObject({
      status: 'unresolved',
      completedHoles: 9,
      outcome: { kind: 'unresolved' },
    });
  });

  it('awards a shared hole winner only when one of three players has the lowest score', () => {
    const standing = evaluateMatchPlay({
      playerIds: ['aino', 'elli', 'sanni'],
      holes: [
        {
          number: 1,
          scoresByPlayerId: { aino: 4, elli: 5, sanni: 4 },
        },
        {
          number: 2,
          scoresByPlayerId: { aino: 5, elli: 3, sanni: 4 },
        },
      ],
      startHole: 1,
      holeCount: 2,
      settings: {
        holeTieRule: 'no-winner',
        carryEligiblePlayerIds: ['aino', 'elli', 'sanni'],
        endTieRule: 'draw',
      },
    });

    expect(standing.winsByPlayerId).toEqual({ aino: 0, elli: 1, sanni: 0 });
    expect(standing.holeResults).toEqual([
      expect.objectContaining({ holeNumber: 1, kind: 'tie', winsAwarded: 0 }),
      expect.objectContaining({ holeNumber: 2, kind: 'winner', winnerId: 'elli' }),
    ]);
    expect(standing.outcome).toEqual({ kind: 'winner', playerIds: ['elli'], wins: 1 });
  });
});
