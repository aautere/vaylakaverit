export const rockGolfTeeLabels = ['R', 'O', 'C', 'K'] as const;

export type RockGolfTeeLabel = (typeof rockGolfTeeLabels)[number];
export type RockGolfLayoutId = '9-holes' | '18-holes';

export type RockGolfTee = {
  label: RockGolfTeeLabel;
  metres: number;
  courseRating: number;
  slopeRating: number;
};

export type RockGolfRoundHole = {
  number: number;
  sourceHoleNumber: number;
  pass: 1 | 2;
  par: number;
  handicapIndex: number;
  metres: Readonly<Record<RockGolfTeeLabel, number>>;
};

export type RockGolfLayout = {
  id: RockGolfLayoutId;
  holes: readonly RockGolfRoundHole[];
  tees: readonly RockGolfTee[];
};

const sourceHoles = [
  { number: 1, metres: { R: 151, O: 129, C: 122, K: 92 } },
  { number: 2, metres: { R: 169, O: 157, C: 157, K: 96 } },
  { number: 3, metres: { R: 175, O: 163, C: 128, K: 88 } },
  { number: 4, metres: { R: 138, O: 119, C: 112, K: 94 } },
  { number: 5, metres: { R: 123, O: 116, C: 86, K: 81 } },
  { number: 6, metres: { R: 205, O: 201, C: 168, K: 149 } },
  { number: 7, metres: { R: 136, O: 124, C: 111, K: 99 } },
  { number: 8, metres: { R: 179, O: 154, C: 148, K: 125 } },
  { number: 9, metres: { R: 162, O: 134, C: 127, K: 110 } },
] as const;

const nineHoleHandicapIndexes = [3, 6, 4, 8, 9, 1, 7, 2, 5] as const;
const eighteenHoleHandicapIndexes = [
  5, 11, 7, 15, 17, 1, 13, 3, 9, 6, 12, 8, 16, 18, 2, 14, 4, 10,
] as const;

function createRoundHoles(
  handicapIndexes: readonly number[],
  pass: 1 | 2,
): readonly RockGolfRoundHole[] {
  return handicapIndexes.map((handicapIndex, index) => {
    const sourceHole = sourceHoles[index % sourceHoles.length];

    if (!sourceHole) {
      throw new Error('Rock Golf source-hole configuration is incomplete.');
    }

    return {
      number: index + 1,
      sourceHoleNumber: sourceHole.number,
      pass,
      par: 3,
      handicapIndex,
      metres: sourceHole.metres,
    };
  });
}

const nineHoleHoles = createRoundHoles(nineHoleHandicapIndexes, 1);
const eighteenHoleHoles = [
  ...createRoundHoles(eighteenHoleHandicapIndexes.slice(0, 9), 1),
  ...createRoundHoles(eighteenHoleHandicapIndexes.slice(9), 2).map((hole, index) => ({
    ...hole,
    number: index + 10,
  })),
] as const;

export const rockGolf = {
  id: 'rock-golf',
  name: 'Rock Golf',
  sourceUrl: 'https://rockgolf.fi/slope-laskin/',
  sourceVersion: '2026-08-26',
  defaultTeeLabel: 'O' as RockGolfTeeLabel,
  supportedRatingTables: ['men'] as const,
  layouts: {
    '9-holes': {
      id: '9-holes',
      holes: nineHoleHoles,
      tees: [
        { label: 'R', metres: 1438, courseRating: 28.6, slopeRating: 102 },
        { label: 'O', metres: 1297, courseRating: 28.1, slopeRating: 100 },
        { label: 'C', metres: 1159, courseRating: 27.5, slopeRating: 98 },
        { label: 'K', metres: 934, courseRating: 26.6, slopeRating: 95 },
      ],
    },
    '18-holes': {
      id: '18-holes',
      holes: eighteenHoleHoles,
      tees: [
        { label: 'R', metres: 2876, courseRating: 57.2, slopeRating: 102 },
        { label: 'O', metres: 2594, courseRating: 56.2, slopeRating: 100 },
        { label: 'C', metres: 2318, courseRating: 55, slopeRating: 98 },
        { label: 'K', metres: 1868, courseRating: 53.2, slopeRating: 95 },
      ],
    },
  },
} as const satisfies {
  id: string;
  name: string;
  sourceUrl: string;
  sourceVersion: string;
  defaultTeeLabel: RockGolfTeeLabel;
  supportedRatingTables: readonly ['men'];
  layouts: Readonly<Record<RockGolfLayoutId, RockGolfLayout>>;
};

export function calculateRockGolfMensPlayingHandicap(
  layoutId: RockGolfLayoutId,
  teeLabel: RockGolfTeeLabel,
  handicapIndex: number,
): number {
  if (!Number.isFinite(handicapIndex)) {
    throw new Error('Handicap Index must be finite.');
  }

  const layout = rockGolf.layouts[layoutId];
  const tee = layout.tees.find((candidate) => candidate.label === teeLabel);

  if (!tee) {
    throw new Error(`Rock Golf tee ${teeLabel} is not available for ${layoutId}.`);
  }

  const usedHandicapIndex =
    layoutId === '9-holes' ? Math.round((handicapIndex / 2) * 10) / 10 : handicapIndex;
  const par = layoutId === '9-holes' ? 27 : 54;

  return Math.round(usedHandicapIndex * (tee.slopeRating / 113) + (tee.courseRating - par));
}
