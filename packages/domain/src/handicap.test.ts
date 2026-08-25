import { describe, expect, it } from 'vitest';
import { allocateRelativeHandicapStrokes, netHoleScore, strokesOnHole } from './handicap.js';

describe('relative handicap strokes', () => {
  it('uses the lowest playing handicap as the baseline', () => {
    const allocation = allocateRelativeHandicapStrokes([
      { playerId: 'player-a', playingHandicap: 15 },
      { playerId: 'player-b', playingHandicap: 20 },
      { playerId: 'player-c', playingHandicap: -2 },
    ]);

    expect(allocation.baselinePlayingHandicap).toBe(-2);
    expect(allocation.strokesByPlayerId.get('player-a')).toBe(17);
    expect(allocation.strokesByPlayerId.get('player-b')).toBe(22);
    expect(allocation.strokesByPlayerId.get('player-c')).toBe(0);
  });

  it('allocates strokes by ascending hole handicap index and repeats after 18', () => {
    expect(strokesOnHole(5, 5)).toBe(1);
    expect(strokesOnHole(5, 6)).toBe(0);
    expect(strokesOnHole(20, 1)).toBe(2);
    expect(strokesOnHole(20, 2)).toBe(2);
    expect(strokesOnHole(20, 3)).toBe(1);
  });

  it('calculates a net score from allocated strokes', () => {
    expect(netHoleScore(6, 5, 3)).toBe(5);
  });
});
