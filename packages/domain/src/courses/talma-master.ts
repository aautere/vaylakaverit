export const teeLabels = ['48', '52', '56', '60', '64'] as const;

export type TeeLabel = (typeof teeLabels)[number];
export type RatingTable = 'men' | 'women';

export type CourseHole = {
  number: number;
  par: number;
  handicapIndex: number;
  metres: Readonly<Record<TeeLabel, number>>;
};

export type TeeRating = {
  courseRating: number;
  slopeRating: number;
};

export type CourseTee = {
  label: TeeLabel;
  metres: number;
  ratings: Readonly<Record<RatingTable, TeeRating>>;
};

export const talmaMaster = {
  id: 'golf-talma-master',
  name: 'Golf Talma Master',
  sourceUrl: 'https://golftalma.fi/master/',
  defaultTeeLabel: '52' as TeeLabel,
  tees: [
    {
      label: '48',
      metres: 4825,
      ratings: {
        men: { courseRating: 67.1, slopeRating: 127 },
        women: { courseRating: 72.7, slopeRating: 123 },
      },
    },
    {
      label: '52',
      metres: 5245,
      ratings: {
        men: { courseRating: 69.2, slopeRating: 131 },
        women: { courseRating: 75.2, slopeRating: 129 },
      },
    },
    {
      label: '56',
      metres: 5649,
      ratings: {
        men: { courseRating: 71.3, slopeRating: 134 },
        women: { courseRating: 77.7, slopeRating: 134 },
      },
    },
    {
      label: '60',
      metres: 6018,
      ratings: {
        men: { courseRating: 73.1, slopeRating: 138 },
        women: { courseRating: 79.9, slopeRating: 138 },
      },
    },
    {
      label: '64',
      metres: 6425,
      ratings: {
        men: { courseRating: 75.1, slopeRating: 142 },
        women: { courseRating: 82.4, slopeRating: 143 },
      },
    },
  ] as const satisfies readonly CourseTee[],
  holes: [
    {
      number: 1,
      par: 5,
      handicapIndex: 11,
      metres: { '48': 370, '52': 455, '56': 485, '60': 510, '64': 525 },
    },
    {
      number: 2,
      par: 4,
      handicapIndex: 13,
      metres: { '48': 290, '52': 310, '56': 337, '60': 355, '64': 370 },
    },
    {
      number: 3,
      par: 3,
      handicapIndex: 17,
      metres: { '48': 125, '52': 135, '56': 155, '60': 170, '64': 190 },
    },
    {
      number: 4,
      par: 5,
      handicapIndex: 1,
      metres: { '48': 405, '52': 435, '56': 455, '60': 495, '64': 520 },
    },
    {
      number: 5,
      par: 4,
      handicapIndex: 15,
      metres: { '48': 320, '52': 320, '56': 340, '60': 355, '64': 370 },
    },
    {
      number: 6,
      par: 3,
      handicapIndex: 7,
      metres: { '48': 100, '52': 115, '56': 125, '60': 138, '64': 150 },
    },
    {
      number: 7,
      par: 4,
      handicapIndex: 9,
      metres: { '48': 210, '52': 225, '56': 270, '60': 295, '64': 330 },
    },
    {
      number: 8,
      par: 4,
      handicapIndex: 5,
      metres: { '48': 230, '52': 270, '56': 290, '60': 310, '64': 325 },
    },
    {
      number: 9,
      par: 4,
      handicapIndex: 3,
      metres: { '48': 320, '52': 335, '56': 367, '60': 390, '64': 405 },
    },
    {
      number: 10,
      par: 5,
      handicapIndex: 6,
      metres: { '48': 390, '52': 410, '56': 430, '60': 460, '64': 495 },
    },
    {
      number: 11,
      par: 3,
      handicapIndex: 16,
      metres: { '48': 145, '52': 165, '56': 165, '60': 180, '64': 195 },
    },
    {
      number: 12,
      par: 4,
      handicapIndex: 14,
      metres: { '48': 295, '52': 310, '56': 325, '60': 340, '64': 360 },
    },
    {
      number: 13,
      par: 3,
      handicapIndex: 18,
      metres: { '48': 110, '52': 125, '56': 140, '60': 155, '64': 170 },
    },
    {
      number: 14,
      par: 4,
      handicapIndex: 10,
      metres: { '48': 250, '52': 285, '56': 305, '60': 330, '64': 335 },
    },
    {
      number: 15,
      par: 4,
      handicapIndex: 2,
      metres: { '48': 315, '52': 335, '56': 360, '60': 370, '64': 400 },
    },
    {
      number: 16,
      par: 4,
      handicapIndex: 4,
      metres: { '48': 295, '52': 315, '56': 340, '60': 365, '64': 390 },
    },
    {
      number: 17,
      par: 5,
      handicapIndex: 12,
      metres: { '48': 380, '52': 405, '56': 430, '60': 450, '64': 505 },
    },
    {
      number: 18,
      par: 4,
      handicapIndex: 8,
      metres: { '48': 275, '52': 295, '56': 330, '60': 350, '64': 375 },
    },
  ] as const satisfies readonly CourseHole[],
} as const;
