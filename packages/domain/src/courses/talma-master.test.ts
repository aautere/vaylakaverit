import { describe, expect, it } from 'vitest';
import {
  lookupTalmaMasterPlayingHandicap,
  talmaMaster,
  talmaMasterPlayingHandicapLookupTable,
  teeLabels,
} from './talma-master.js';

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

  it('contains the published playing-handicap ranges for every tee and rating table', () => {
    for (const teeLabel of teeLabels) {
      expect(talmaMasterPlayingHandicapLookupTable[teeLabel].men.length).toBeGreaterThan(0);
      expect(talmaMasterPlayingHandicapLookupTable[teeLabel].women.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['48', 'men', -4, -9],
    ['48', 'men', 18, 15],
    ['52', 'men', -3.2, -7],
    ['52', 'men', -3.1, -6],
    ['52', 'men', 18, 18],
    ['52', 'men', 54, 60],
    ['52', 'women', -4.1, -1],
    ['52', 'women', -3.2, 0],
    ['52', 'women', 18, 24],
    ['52', 'women', 53.6, 64],
    ['56', 'women', 18, 27],
    ['60', 'men', 18, 23],
    ['64', 'women', 18, 33],
  ] as const)(
    'looks up the official %s %s table for Handicap Index %s',
    (teeLabel, ratingTable, handicapIndex, expectedPlayingHandicap) => {
      expect(lookupTalmaMasterPlayingHandicap(teeLabel, ratingTable, handicapIndex)).toBe(
        expectedPlayingHandicap,
      );
    },
  );

  it('rejects a Handicap Index outside the selected official table in Finnish', () => {
    expect(() => lookupTalmaMasterPlayingHandicap('52', 'men', 54.1)).toThrow(
      'Tasoitusindeksille 54.1 ei löydy Golf Talma Masterin tiin 52 miesten virallisesta pelitasoitustaulukosta.',
    );
    expect(() => lookupTalmaMasterPlayingHandicap('52', 'women', -4.2)).toThrow(
      'Tasoitusindeksille -4.2 ei löydy Golf Talma Masterin tiin 52 naisten virallisesta pelitasoitustaulukosta.',
    );
  });
});
