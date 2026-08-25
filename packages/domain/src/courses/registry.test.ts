import { describe, expect, it } from 'vitest';
import {
  legacyTalmaMasterCourseSnapshot,
  playingHandicapForSnapshot,
  selectCourseSnapshot,
} from './registry.js';

describe('course registry', () => {
  it('keeps the legacy Talma 18-hole configuration available by default', () => {
    const snapshot = selectCourseSnapshot();

    expect(snapshot).toMatchObject({
      courseId: 'golf-talma-master',
      layoutId: '18-holes',
      roundLength: 18,
      supportedRatingTables: ['men', 'women'],
    });
    expect(snapshot.holes).toHaveLength(18);
    expect(legacyTalmaMasterCourseSnapshot).toEqual(snapshot);
  });

  it('creates Rock snapshots with valid round-hole mappings and table policies', () => {
    const nineHoles = selectCourseSnapshot({
      courseId: 'rock-golf',
      courseVersion: '2026-08-26',
      layoutId: '9-holes',
      roundLength: 9,
    });
    const eighteenHoles = selectCourseSnapshot({
      courseId: 'rock-golf',
      layoutId: '18-holes',
      roundLength: 18,
    });

    expect(nineHoles.holes.map((hole) => hole.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(eighteenHoles.holes[11]).toMatchObject({
      number: 12,
      sourceHoleNumber: 3,
      pass: 2,
    });
    expect(playingHandicapForSnapshot(nineHoles, 'O', 'men', 18)).toBe(9);
    expect(playingHandicapForSnapshot(nineHoles, 'O', 'women', 18)).toBeUndefined();
  });

  it('rejects unsupported Rock layouts and stale course versions', () => {
    expect(() => selectCourseSnapshot({ courseId: 'rock-golf' })).toThrow(
      'Valitse Rock Golfin kierroksen pituus.',
    );
    expect(() =>
      selectCourseSnapshot({
        courseId: 'rock-golf',
        courseVersion: 'old',
        layoutId: '9-holes',
      }),
    ).toThrow('Valitun kentän tiedot ovat vanhentuneet.');
  });
});
