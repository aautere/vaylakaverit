export type RatingTable = 'men' | 'women';

export type PreviewRoundHole = {
  number: number;
  sourceHoleNumber: number;
  pass: number;
};

export type PreviewCourseLayout = {
  id: string;
  roundLength: number;
  tees: ReadonlyArray<{ label: string; metres: number }>;
  holes: ReadonlyArray<PreviewRoundHole>;
};

export type PreviewCourse = {
  id: string;
  version: string;
  name: string;
  defaultTeeLabel: string;
  supportedRatingTables: ReadonlyArray<RatingTable>;
  layouts: ReadonlyArray<PreviewCourseLayout>;
};

export type PreviewCourseSnapshot = {
  courseId: string;
  courseVersion: string;
  courseName: string;
  layoutId: string;
  roundLength: number;
  defaultTeeLabel: string;
  supportedRatingTables: ReadonlyArray<RatingTable>;
  tees: ReadonlyArray<{ label: string; metres: number }>;
  holes: ReadonlyArray<PreviewRoundHole>;
};

export const courseSelectionCopy = {
  loading: 'Kenttiä ladataan…',
  unavailable: 'Kenttäasetuksia ei voitu ladata. Yritä uudelleen.',
  stale: 'Kentän asetukset päivittyivät. Valitse kenttä ja kierroksen pituus uudelleen.',
  missing: 'Valitse kenttä ja kierroksen pituus ennen kierroksen luontia.',
  offline: 'Uuden kierroksen luominen tarvitsee yhteyden. Yritä uudelleen, kun yhteys palautuu.',
  rockRating: 'Rock Golfilla käytetään tällä hetkellä miesten pelitasoitustaulukkoa.',
  unavailableRockRating:
    'Rock Golfilla ei voi tällä hetkellä käyttää naisten pelitasoitustaulukkoa. Käytössä on miesten pelitasoitustaulukko.',
} as const;

export function selectedCourseLayout(
  courses: ReadonlyArray<PreviewCourse>,
  courseId: string | null,
  layoutId: string | null,
): { course: PreviewCourse; layout: PreviewCourseLayout } | undefined {
  const course = courses.find((candidate) => candidate.id === courseId);
  const layout = course?.layouts.find((candidate) => candidate.id === layoutId);
  return course && layout ? { course, layout } : undefined;
}

export function selectedCourseSummary(course: string, roundLength: number): string {
  return roundLength === 18 && course === 'Rock Golf'
    ? 'Rock Golf · 18 reikää (2 × 9)'
    : `${course} · ${roundLength} reikää`;
}

export function teeAndRatingForCourse(
  course: Pick<PreviewCourse, 'defaultTeeLabel' | 'supportedRatingTables'>,
  tees: ReadonlyArray<{ label: string }>,
  teeLabel: string,
  ratingTable: RatingTable,
): { teeLabel: string; ratingTable: RatingTable; ratingChanged: boolean } {
  const nextTeeLabel = tees.some((tee) => tee.label === teeLabel)
    ? teeLabel
    : course.defaultTeeLabel;
  const nextRatingTable = course.supportedRatingTables.includes(ratingTable)
    ? ratingTable
    : course.supportedRatingTables[0]!;

  return {
    teeLabel: nextTeeLabel,
    ratingTable: nextRatingTable,
    ratingChanged: nextRatingTable !== ratingTable,
  };
}

export function secondPassContext(
  holes: ReadonlyArray<PreviewRoundHole>,
  holeNumber: number,
): string | undefined {
  const hole = holes.find((candidate) => candidate.number === holeNumber);
  return hole?.pass === 2 ? `Toinen kierros, reikä ${hole.sourceHoleNumber}` : undefined;
}

export function courseSelectionFocusTarget(
  hasConditionalLength: boolean,
  fromKeyboard: boolean,
  isStaleSelection = false,
): 'course' | 'length' | undefined {
  if (isStaleSelection) {
    return 'course';
  }
  return hasConditionalLength && fromKeyboard ? 'length' : undefined;
}
