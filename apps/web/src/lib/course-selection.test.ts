import { describe, expect, it } from 'vitest';
import {
  courseSelectionCopy,
  courseSelectionFocusTarget,
  secondPassContext,
  selectedCourseLayout,
  selectedCourseSummary,
  teeAndRatingForCourse,
  type PreviewCourse,
} from './course-selection';

const courses: PreviewCourse[] = [
  {
    id: 'golf-talma-master',
    version: '2017-06',
    name: 'Golf Talma Master',
    defaultTeeLabel: '52',
    supportedRatingTables: ['men', 'women'],
    layouts: [{ id: '18-holes', roundLength: 18, tees: [{ label: '52', metres: 0 }], holes: [] }],
  },
  {
    id: 'rock-golf',
    version: '2026-08-26',
    name: 'Rock Golf',
    defaultTeeLabel: 'O',
    supportedRatingTables: ['men'],
    layouts: [
      {
        id: '9-holes',
        roundLength: 9,
        tees: [{ label: 'O', metres: 0 }],
        holes: [],
      },
      {
        id: '18-holes',
        roundLength: 18,
        tees: [{ label: 'O', metres: 0 }],
        holes: [],
      },
    ],
  },
];

describe('course selection configuration', () => {
  it("keeps Talma's configured layout and rating table", () => {
    const selection = selectedCourseLayout(courses, 'golf-talma-master', '18-holes')!;

    expect(selection.layout.roundLength).toBe(18);
    expect(teeAndRatingForCourse(selection.course, selection.layout.tees, '52', 'women')).toEqual({
      teeLabel: '52',
      ratingTable: 'women',
      ratingChanged: false,
    });
  });

  it('requires a Rock layout and switches a stale women selection to men', () => {
    expect(selectedCourseLayout(courses, 'rock-golf', null)).toBeUndefined();
    const selection = selectedCourseLayout(courses, 'rock-golf', '9-holes')!;

    expect(teeAndRatingForCourse(selection.course, selection.layout.tees, '52', 'women')).toEqual({
      teeLabel: 'O',
      ratingTable: 'men',
      ratingChanged: true,
    });
  });
});

describe('course selection Finnish states', () => {
  it('uses the approved selection, offline, and Rock labels', () => {
    expect(courseSelectionCopy.missing).toBe(
      'Valitse kenttä ja kierroksen pituus ennen kierroksen luontia.',
    );
    expect(courseSelectionCopy.offline).toBe(
      'Uuden kierroksen luominen tarvitsee yhteyden. Yritä uudelleen, kun yhteys palautuu.',
    );
    expect(selectedCourseSummary('Rock Golf', 18)).toBe('Rock Golf · 18 reikää (2 × 9)');
  });

  it('distinguishes the second Rock pass in score context', () => {
    expect(
      secondPassContext(
        [
          { number: 3, sourceHoleNumber: 3, pass: 1 },
          { number: 12, sourceHoleNumber: 3, pass: 2 },
        ],
        12,
      ),
    ).toBe('Toinen kierros, reikä 3');
    expect(secondPassContext([{ number: 3, sourceHoleNumber: 3, pass: 1 }], 3)).toBeUndefined();
  });

  it('moves focus only for keyboard-triggered Rock length disclosure and stale errors', () => {
    expect(courseSelectionFocusTarget(true, true)).toBe('length');
    expect(courseSelectionFocusTarget(true, false)).toBeUndefined();
    expect(courseSelectionFocusTarget(false, true, true)).toBe('course');
  });
});
