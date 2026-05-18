export type TermKey =
  | 'gir'
  | 'fairways'
  | 'putts'
  | 'scrambling'
  | 'differential'
  | 'strokesGained'
  | 'sgOffTee'
  | 'sgApproach'
  | 'sgAroundGreen'
  | 'sgPutting'
  | 'upAndDown'
  | 'whsIndex'
  | 'scoringAverage'
  | 'proximity'
  | 'approachDistance';

type TierMap = Record<TermKey, string>;

const EXPERT: TierMap = {
  gir:              'GIR%',
  fairways:         'FIR%',
  putts:            'Putts per hole',
  scrambling:       'Scrambling%',
  differential:     'Differential',
  strokesGained:    'Strokes Gained',
  sgOffTee:         'SG: Off the Tee',
  sgApproach:       'SG: Approach',
  sgAroundGreen:    'SG: Around the Green',
  sgPutting:        'SG: Putting',
  upAndDown:        'Up & Down%',
  whsIndex:         'WHS Index',
  scoringAverage:   'Scoring Avg',
  proximity:        'Proximity',
  approachDistance: 'Approach Distance',
};

const STANDARD: TierMap = {
  gir:              'GIR%',
  fairways:         'Fairways%',
  putts:            'Avg Putts',
  scrambling:       'Scrambling%',
  differential:     'Differential',
  strokesGained:    'Strokes Gained (est.)',
  sgOffTee:         'Tee Shot Quality',
  sgApproach:       'Approach Quality',
  sgAroundGreen:    'Short Game',
  sgPutting:        'Putting Quality',
  upAndDown:        'Up & Down%',
  whsIndex:         'Handicap Index',
  scoringAverage:   'Avg Score',
  proximity:        'Avg Proximity',
  approachDistance: 'Approach Distance',
};

const BEGINNER: TierMap = {
  gir:              'Greens hit',
  fairways:         'Fairways hit',
  putts:            'Putts per hole',
  scrambling:       'Up & down rate',
  differential:     'Round rating',
  strokesGained:    'Shot quality',
  sgOffTee:         'Tee shots',
  sgApproach:       'Approach shots',
  sgAroundGreen:    'Short game',
  sgPutting:        'Putting',
  upAndDown:        'Up & downs',
  whsIndex:         'Handicap',
  scoringAverage:   'Average score',
  proximity:        'How close to hole',
  approachDistance: 'Distance to green',
};

export function getTerminology(handicap: number, key: TermKey): string {
  const map = handicap < 12 ? EXPERT : handicap < 28 ? STANDARD : BEGINNER;
  return map[key];
}
