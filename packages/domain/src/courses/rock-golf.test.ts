import { describe, expect, it } from 'vitest';
import { calculateRockGolfMensPlayingHandicap, rockGolf, rockGolfTeeLabels } from './rock-golf.js';

describe('Rock Golf course data', () => {
  it('uses the selected calculator snapshot and tee O default', () => {
    expect(rockGolf.sourceVersion).toBe('2026-08-26');
    expect(rockGolf.defaultTeeLabel).toBe('O');
    expect(rockGolf.supportedRatingTables).toEqual(['men']);
  });

  it('contains selected calculator tee totals and ratings for both layouts', () => {
    expect(rockGolf.layouts['9-holes'].tees).toEqual([
      { label: 'R', metres: 1438, courseRating: 28.6, slopeRating: 102 },
      { label: 'O', metres: 1297, courseRating: 28.1, slopeRating: 100 },
      { label: 'C', metres: 1159, courseRating: 27.5, slopeRating: 98 },
      { label: 'K', metres: 934, courseRating: 26.6, slopeRating: 95 },
    ]);
    expect(rockGolf.layouts['18-holes'].tees.map((tee) => tee.label)).toEqual(rockGolfTeeLabels);
  });

  it('maps the 18-hole layout to two distinct passes of the nine physical holes', () => {
    const holes = rockGolf.layouts['18-holes'].holes;

    expect(holes).toHaveLength(18);
    expect(holes.slice(0, 9).map((hole) => hole.sourceHoleNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(holes.slice(9).map((hole) => hole.sourceHoleNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(holes[11]).toMatchObject({ number: 12, sourceHoleNumber: 3, pass: 2 });
  });

  it('uses the confirmed nine-hole and eighteen-hole handicap-index patterns', () => {
    expect(rockGolf.layouts['9-holes'].holes.map((hole) => hole.handicapIndex)).toEqual([
      3, 6, 4, 8, 9, 1, 7, 2, 5,
    ]);
    expect(rockGolf.layouts['18-holes'].holes.map((hole) => hole.handicapIndex)).toEqual([
      5, 11, 7, 15, 17, 1, 13, 3, 9, 6, 12, 8, 16, 18, 2, 14, 4, 10,
    ]);
  });

  it("calculates men's playing handicap with the selected calculator policy", () => {
    expect(calculateRockGolfMensPlayingHandicap('18-holes', 'O', 18)).toBe(18);
    expect(calculateRockGolfMensPlayingHandicap('9-holes', 'O', 18)).toBe(9);
    expect(calculateRockGolfMensPlayingHandicap('9-holes', 'O', 18.1)).toBe(9);
  });
});
