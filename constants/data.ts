import { WeaknessOption, GoalOption, WeaknessArea } from '../types';

export interface WeeklyFocusEntry {
  title: string;
  emoji: string;
  desc: string;
  tips: string[];
}

export const WEEKLY_FOCUS_DATA: Record<WeaknessArea, WeeklyFocusEntry> = {
  driving: {
    title: 'Tee Shot Accuracy',
    emoji: '🏌️',
    desc: 'Fairways are the foundation of low scores. This week, commit to a specific target on every tee shot and build a reliable pre-shot routine.',
    tips: [
      'Set two alignment sticks on the range — one on your target line, one on your toe line',
      'Pick a specific tree or landmark, not just "the fairway"',
      'Slow your transition — most bad drives come from an overeager downswing',
    ],
  },
  long_irons: {
    title: 'Long Iron Confidence',
    emoji: '⛳',
    desc: 'Long irons intimidate most golfers. Build trust this week by focusing on making clean contact and sweeping the ball, not digging.',
    tips: [
      'Tee the ball slightly for confidence reps before hitting off the turf',
      'Focus on a shallow attack angle — sweep, don\'t dig',
      'Keep your head still through impact for solid contact',
    ],
  },
  mid_irons: {
    title: 'Mid Iron Control',
    emoji: '🎯',
    desc: 'Mid irons set up your scoring chances. Work on dialling in exact yardages and consistently finding the centre of the face.',
    tips: [
      'Track actual carry distance for each club with a range finder',
      'Hit 10 balls at a specific flag per session — quality over quantity',
      'Aim for consistent divots just in front of the ball position',
    ],
  },
  short_irons: {
    title: 'Short Iron Precision',
    emoji: '📍',
    desc: 'With a short iron in hand you should be attacking flags. Dial in your exact distances and sharpen your ball-striking this week.',
    tips: [
      'Know your carry distances at 50%, 75%, and 100% swings',
      'Aim at a specific target — not just the general green',
      'Work on controlling trajectory: low punch vs high soft shot',
    ],
  },
  wedges: {
    title: 'Wedge Distance Ladder',
    emoji: '🔧',
    desc: 'The scoring zone starts inside 125 yards. Build a reliable distance ladder with each wedge to attack pins with confidence.',
    tips: [
      'Create three distances per wedge using 50%, 75%, and full swings',
      'Practice partial shots from exact yardages — 40, 60, 80 yards',
      'Focus on consistent spin and trajectory, not just distance',
    ],
  },
  bunkers: {
    title: 'Sand Game',
    emoji: '🏖️',
    desc: 'Bunker shots are one of the quickest skills to improve with focused practice. Build a reliable technique you can trust under pressure.',
    tips: [
      'Open the face before gripping — set up with the face aiming right of target',
      'Focus on a spot 2 inches behind the ball, not the ball itself',
      'Commit to accelerating through the sand — deceleration is the #1 fault',
    ],
  },
  chipping: {
    title: 'Short Game Touch',
    emoji: '🌀',
    desc: 'Up-and-downs are where rounds are saved. Focus on landing spot control this week and build feel around the green from different lies.',
    tips: [
      'Pick a specific landing spot every single chip — never aim at the hole',
      'Practice from different lies: tight, fluffy, and rough',
      'Track up-and-down percentage across a session to measure improvement',
    ],
  },
  putting: {
    title: 'Putting Confidence',
    emoji: '⛳',
    desc: 'Putting is nearly 40% of your score. This week lock in your stroke mechanics and build a consistent pre-putt routine that holds up under pressure.',
    tips: [
      '3-foot circle drill: place 8 balls around the hole and make all 8 in a row',
      'Lag putting from 40+ feet — focus on leaving the ball within tap-in range',
      'Develop a consistent 2-step read ritual: line, then speed',
    ],
  },
  mental: {
    title: 'Mental Game',
    emoji: '🧠',
    desc: 'Your mind is your most powerful club. This week work on staying present, resetting quickly after bad shots, and playing each shot as its own event.',
    tips: [
      'Use the same pre-shot routine on every shot, no matter what happened before',
      '10-second reset rule: after a bad shot, give yourself 10 seconds to feel it, then move on',
      'Focus on the process (good swing, good target) not the outcome (score)',
    ],
  },
  course_management: {
    title: 'Play Smarter Golf',
    emoji: '🗺️',
    desc: 'The smartest shot isn\'t always the boldest. This week focus on playing to your strengths, avoiding trouble, and turning bogeys into pars.',
    tips: [
      'Identify the safe miss side on every hole before you tee off',
      'Never aim at a flag guarded by a penalty area or deep bunker',
      'When in doubt, take one extra club — most amateurs are short 80% of the time',
    ],
  },
};

export const WEAKNESS_OPTIONS: WeaknessOption[] = [
  { key: 'driving', label: 'Driver / Tee Shots', icon: '🏌️' },
  { key: 'long_irons', label: 'Long Irons (2-5)', icon: '⛳' },
  { key: 'mid_irons', label: 'Mid Irons (6-8)', icon: '🎯' },
  { key: 'short_irons', label: 'Short Irons (9-PW)', icon: '📍' },
  { key: 'wedges', label: 'Wedge Play', icon: '🔧' },
  { key: 'bunkers', label: 'Bunker Shots', icon: '🏖️' },
  { key: 'chipping', label: 'Chipping / Pitching', icon: '🌀' },
  { key: 'putting', label: 'Putting', icon: '🎱' },
  { key: 'mental', label: 'Mental Game', icon: '🧠' },
  { key: 'course_management', label: 'Course Management', icon: '🗺️' },
];

export const GOAL_OPTIONS: GoalOption[] = [
  {
    key: 'lower_handicap',
    label: 'Lower My Handicap',
    description: 'Systematic improvement toward a specific handicap target',
  },
  {
    key: 'consistency',
    label: 'Play More Consistently',
    description: 'Reduce blow-up holes and round-to-round variance',
  },
  {
    key: 'tournament_prep',
    label: 'Prepare for Tournaments',
    description: 'Sharpen competitive skills and on-course focus',
  },
  {
    key: 'course_management',
    label: 'Smarter Course Management',
    description: 'Make better decisions and play to your strengths',
  },
  {
    key: 'enjoyment',
    label: 'Just Enjoy the Game More',
    description: 'Reduce frustration and build confidence on the course',
  },
  {
    key: 'fitness',
    label: 'Improve Golf Fitness',
    description: 'Build strength, flexibility, and endurance for golf',
  },
];

export const FALLBACK_DRILLS = {
  putting: [
    {
      id: 'p1',
      name: 'Gate Drill',
      description: 'Improve putter face control and starting line',
      duration: 15,
      category: 'putting' as const,
      difficulty: 'beginner' as const,
      equipment: ['Putter', '2 tees or alignment sticks'],
      instructions: [
        'Place two tees just wider than your putter head about 6 inches in front of the ball',
        'Make strokes without touching the tees',
        'Start with 4-foot putts and gradually increase distance',
      ],
      focusPoints: ['Face angle at impact', 'Consistent stroke path', 'Smooth acceleration'],
    },
    {
      id: 'p2',
      name: 'Circle Drill',
      description: 'Build confidence on short putts under pressure',
      duration: 20,
      category: 'putting' as const,
      difficulty: 'intermediate' as const,
      equipment: ['Putter', '8 balls', 'Tees'],
      instructions: [
        'Place 8 balls in a circle around the hole at 3 feet',
        'Make all 8 consecutively — if you miss, start over',
        'Progress to 4-foot and 5-foot circles',
      ],
      focusPoints: ['Pre-putt routine', 'Eye on the back of the ball', 'Follow through to the hole'],
    },
  ],
  driving: [
    {
      id: 'd1',
      name: 'Alignment Station',
      description: 'Groove consistent setup and alignment off the tee',
      duration: 20,
      category: 'driving' as const,
      difficulty: 'beginner' as const,
      equipment: ['Driver', '2 alignment sticks', 'Tees'],
      instructions: [
        'Place one stick along your target line, another along your toe line',
        'Hit 20 drives focusing on square setup',
        'Check alignment before every shot',
      ],
      focusPoints: ['Parallel alignment', 'Ball position off front heel', 'Shoulder tilt at address'],
    },
  ],
  chipping: [
    {
      id: 'c1',
      name: 'Landing Zone Drill',
      description: 'Develop feel for landing spot control',
      duration: 20,
      category: 'chipping' as const,
      difficulty: 'beginner' as const,
      equipment: ['Wedges', 'Towel or tee as target'],
      instructions: [
        'Place a towel 3 feet onto the green as your landing zone',
        'Hit 10 chips from various lies aiming to land on the towel',
        'Focus on the landing spot, not the hole',
      ],
      focusPoints: ['Consistent landing spot', 'Hands ahead at impact', 'Weight on front foot'],
    },
  ],
};
