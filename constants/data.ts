import { WeaknessOption, GoalOption } from '../types';

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
