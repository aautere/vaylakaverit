import { describe, expect, it } from 'vitest';
import { talmaMaster, teeLabels } from './talma-master.js';

describe('Golf Talma Master course data', () => {
  it('uses tee 52 as the configured default', () => {
    expect(talmaMaster.defaultTeeLabel).toBe('52');
  });

  it('contains 18 holes and every official tee label', () => {
    expect(talmaMaster.holes).toHaveLength(18);
    expect(talmaMaster.tees.map((tee) => tee.label)).toEqual(teeLabels);
  });

  it('has a par 72 scorecard with unique handicap indexes', () => {
    const totalPar = talmaMaster.holes.reduce((total, hole) => total + hole.par, 0);
    const handicapIndexes = talmaMaster.holes.map((hole) => hole.handicapIndex);

    expect(totalPar).toBe(72);
    expect(new Set(handicapIndexes).size).toBe(18);
  });
});
