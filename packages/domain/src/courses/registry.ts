import {
  lookupTalmaMasterPlayingHandicap,
  talmaMaster,
  talmaMasterPlayingHandicapLookupTable,
  teeLabels,
  type RatingTable,
  type TeeLabel,
} from './talma-master.js';
import {
  calculateRockGolfMensPlayingHandicap,
  rockGolf,
  type RockGolfLayoutId,
  type RockGolfTeeLabel,
} from './rock-golf.js';

export type CourseRatingTable = RatingTable;
export type PlayingHandicapPolicy = 'talma-master-lookup' | 'rock-golf-men';

export type RoundHole = {
  number: number;
  sourceHoleNumber: number;
  pass: number;
  par: number;
  handicapIndex: number;
  metres: Readonly<Record<string, number>>;
};

export type CourseTeeSnapshot = {
  label: string;
  metres: number;
};

export type CourseLayoutSnapshot = {
  id: string;
  roundLength: number;
  holes: readonly RoundHole[];
  tees: readonly CourseTeeSnapshot[];
};

export type CourseSnapshot = {
  courseId: string;
  courseVersion: string;
  courseName: string;
  sourceUrl: string;
  layoutId: string;
  roundLength: number;
  defaultTeeLabel: string;
  supportedRatingTables: readonly CourseRatingTable[];
  tees: readonly CourseTeeSnapshot[];
  holes: readonly RoundHole[];
  playingHandicapPolicy: PlayingHandicapPolicy;
};

export type CourseSelection = {
  courseId?: string;
  courseVersion?: string;
  layoutId?: string;
  roundLength?: number;
};

export type CourseDefinition = {
  id: string;
  version: string;
  name: string;
  sourceUrl: string;
  defaultTeeLabel: string;
  supportedRatingTables: readonly CourseRatingTable[];
  layouts: readonly CourseLayoutSnapshot[];
  playingHandicapPolicy: PlayingHandicapPolicy;
};

const talmaMasterLayout: CourseLayoutSnapshot = {
  id: '18-holes',
  roundLength: talmaMaster.holes.length,
  holes: talmaMaster.holes.map((hole) => ({
    ...hole,
    sourceHoleNumber: hole.number,
    pass: 1,
  })),
  tees: talmaMaster.tees.map((tee) => ({ label: tee.label, metres: tee.metres })),
};

const rockGolfLayouts: readonly CourseLayoutSnapshot[] = Object.values(rockGolf.layouts).map(
  (layout) => ({
    id: layout.id,
    roundLength: layout.holes.length,
    holes: layout.holes,
    tees: layout.tees.map((tee) => ({ label: tee.label, metres: tee.metres })),
  }),
);

export const courseRegistry: readonly CourseDefinition[] = [
  {
    id: talmaMaster.id,
    version: '2017-06',
    name: talmaMaster.name,
    sourceUrl: talmaMaster.sourceUrl,
    defaultTeeLabel: talmaMaster.defaultTeeLabel,
    supportedRatingTables: ['men', 'women'],
    layouts: [talmaMasterLayout],
    playingHandicapPolicy: 'talma-master-lookup',
  },
  {
    id: rockGolf.id,
    version: rockGolf.sourceVersion,
    name: rockGolf.name,
    sourceUrl: rockGolf.sourceUrl,
    defaultTeeLabel: rockGolf.defaultTeeLabel,
    supportedRatingTables: rockGolf.supportedRatingTables,
    layouts: rockGolfLayouts,
    playingHandicapPolicy: 'rock-golf-men',
  },
];

export const legacyTalmaMasterCourseSnapshot: CourseSnapshot = snapshotOf(
  courseRegistry[0]!,
  talmaMasterLayout,
);

export function selectCourseSnapshot(selection: CourseSelection = {}): CourseSnapshot {
  const courseId = selection.courseId ?? talmaMaster.id;
  const course = courseRegistry.find((candidate) => candidate.id === courseId);
  if (!course) {
    throw new Error('Valittua kenttää ei ole saatavilla.');
  }
  if (selection.courseVersion !== undefined && selection.courseVersion !== course.version) {
    throw new Error(
      'Valitun kentän tiedot ovat vanhentuneet. Päivitä sivu ja valitse kenttä uudelleen.',
    );
  }

  const hasLayoutSelection =
    selection.layoutId !== undefined || selection.roundLength !== undefined;
  if (course.id === rockGolf.id && !hasLayoutSelection) {
    throw new Error('Valitse Rock Golfin kierroksen pituus.');
  }

  const layout = course.layouts.find(
    (candidate) =>
      (selection.layoutId === undefined || candidate.id === selection.layoutId) &&
      (selection.roundLength === undefined || candidate.roundLength === selection.roundLength),
  );
  if (!layout) {
    throw new Error('Valittu kierroksen pituus ei ole käytettävissä tällä kentällä.');
  }
  return snapshotOf(course, layout);
}

export function isSupportedTee(snapshot: CourseSnapshot, teeLabel: string): boolean {
  return snapshot.tees.some((tee) => tee.label === teeLabel);
}

export function isSupportedRatingTable(snapshot: CourseSnapshot, ratingTable: string): boolean {
  return snapshot.supportedRatingTables.includes(ratingTable as CourseRatingTable);
}

export function playingHandicapForSnapshot(
  snapshot: CourseSnapshot,
  teeLabel: string,
  ratingTable: string,
  handicapIndex: number,
): number | undefined {
  if (
    !Number.isFinite(handicapIndex) ||
    !isSupportedTee(snapshot, teeLabel) ||
    !isSupportedRatingTable(snapshot, ratingTable)
  ) {
    return undefined;
  }

  if (snapshot.playingHandicapPolicy === 'rock-golf-men') {
    if (ratingTable !== 'men' || !isRockGolfLayoutId(snapshot.layoutId)) {
      return undefined;
    }
    return calculateRockGolfMensPlayingHandicap(
      snapshot.layoutId,
      teeLabel as RockGolfTeeLabel,
      handicapIndex,
    );
  }

  if (!isTalmaTeeLabel(teeLabel) || (ratingTable !== 'men' && ratingTable !== 'women')) {
    return undefined;
  }
  const range = talmaMasterPlayingHandicapLookupTable[teeLabel][ratingTable].find(
    ({ minimum, maximum }) => handicapIndex >= minimum && handicapIndex <= maximum,
  );
  return range ? lookupTalmaMasterPlayingHandicap(teeLabel, ratingTable, handicapIndex) : undefined;
}

function snapshotOf(course: CourseDefinition, layout: CourseLayoutSnapshot): CourseSnapshot {
  return {
    courseId: course.id,
    courseVersion: course.version,
    courseName: course.name,
    sourceUrl: course.sourceUrl,
    layoutId: layout.id,
    roundLength: layout.roundLength,
    defaultTeeLabel: course.defaultTeeLabel,
    supportedRatingTables: [...course.supportedRatingTables],
    tees: layout.tees.map((tee) => ({ ...tee })),
    holes: layout.holes.map((hole) => ({ ...hole, metres: { ...hole.metres } })),
    playingHandicapPolicy: course.playingHandicapPolicy,
  };
}

function isTalmaTeeLabel(value: string): value is TeeLabel {
  return teeLabels.includes(value as TeeLabel);
}

function isRockGolfLayoutId(value: string): value is RockGolfLayoutId {
  return value === '9-holes' || value === '18-holes';
}
