import { describe, expect, it } from 'vitest';
import { createPendingScoreChange, createScoreChangeId } from './score-outbox';

describe('score outbox', () => {
  it('creates collision-resistant UUID score-change identifiers', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createScoreChangeId()));

    expect(ids.size).toBe(100);
    expect([...ids]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      ]),
    );
  });

  it('orders locally created changes with distinct creation times', () => {
    const first = createPendingScoreChange('round-1', 'player-1', 1, 4);
    const second = createPendingScoreChange('round-1', 'player-1', 2, 5);

    expect(first).toMatchObject({
      roundId: 'round-1',
      playerId: 'player-1',
      holeNumber: 1,
      strokes: 4,
    });
    expect(first.createdAt < second.createdAt).toBe(true);
  });
});
