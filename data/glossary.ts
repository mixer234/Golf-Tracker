export const GLOSSARY = {
  gir: {
    term: 'Greens in Regulation',
    explanation:
      'You hit a green in regulation when your ball is on the putting surface in the correct number of shots — 1 shot on a par 3, 2 shots on a par 4, 3 shots on a par 5.',
    example: 'If you hit 10 greens in an 18-hole round, your GIR% is 56%.',
    whyItMatters:
      'Tour pros hit around 65% of greens. The more greens you hit, the more birdie chances you create and the fewer scrambling situations you face.',
  },
  fairways: {
    term: 'Fairways Hit',
    explanation:
      'The percentage of par 4 and par 5 holes where your tee shot lands in the fairway.',
    example:
      'If you hit 8 of 14 fairways on par 4s and 5s, your fairway percentage is 57%.',
    whyItMatters:
      'Hitting fairways gives you a clean lie for your approach shot. Golfers who hit more fairways typically have lower scores because approach shots from the rough are much harder.',
  },
  putts: {
    term: 'Putts per Hole',
    explanation:
      'The average number of putts you take per hole across your round.',
    example:
      'If you take 34 total putts over 18 holes, your average is 1.9 putts per hole.',
    whyItMatters:
      'The average amateur takes 2.1 putts per hole. Getting this below 1.8 is one of the fastest ways to lower your score.',
  },
  scrambling: {
    term: 'Scrambling',
    explanation:
      'The percentage of times you make par or better after missing a green in regulation.',
    example:
      'If you miss 8 greens but still make par or better on 4 of those holes, your scrambling rate is 50%.',
    whyItMatters:
      'Good scramblers save pars even when their ball-striking lets them down. Tour pros scramble around 60% of the time.',
  },
  differential: {
    term: 'Score Differential',
    explanation:
      'A number that measures how well you played relative to the difficulty of the course. It accounts for the course rating and slope to make scores from different courses comparable.',
    example:
      'Shooting 85 on a hard course (slope 130) gives a better differential than shooting 85 on an easy course (slope 110).',
    whyItMatters:
      'Your WHS handicap index is calculated from your best differentials. Lower differentials mean better rounds.',
  },
  strokesGained: {
    term: 'Strokes Gained',
    explanation:
      'A stat that measures how many shots you gain or lose compared to a scratch golfer benchmark in each part of the game.',
    example:
      'If your SG: Putting is +1.2, you gained 1.2 shots on the field with your putting. If it is -2.4, putting cost you 2.4 shots.',
    whyItMatters:
      'Strokes gained tells you exactly where you are losing shots so you can focus practice where it matters most.',
  },
  upAndDown: {
    term: 'Up & Down',
    explanation:
      'Getting up and down means holing out in 2 shots from off the green — one chip or pitch shot, then one putt.',
    example:
      'If you miss 10 greens and save par on 5 of them, your up and down rate is 50%.',
    whyItMatters:
      'A good up and down rate protects your score when your iron play lets you down. It is one of the biggest separators between handicap levels.',
  },
  whsIndex: {
    term: 'WHS Handicap Index',
    explanation:
      'Your official World Handicap System index is calculated from the best 8 of your last 20 score differentials, multiplied by 0.96.',
    example:
      'If your best 8 differentials average 14.8, your WHS index is 14.8 × 0.96 = 14.2.',
    whyItMatters:
      'Your handicap index is used to calculate your course handicap for any course you play, making competition fair between players of different abilities.',
  },
  scoringAverage: {
    term: 'Scoring Average',
    explanation:
      'The average score you shoot per round, calculated across your recent rounds.',
    example:
      'If your last 5 rounds were 88, 91, 85, 89, and 87, your scoring average is 88.',
    whyItMatters:
      'Scoring average is the clearest measure of overall improvement. As your game improves in individual areas, your scoring average will drop.',
  },
  proximity: {
    term: 'Proximity to Hole',
    explanation:
      'How close your approach shot finishes to the hole on average, measured in feet.',
    example:
      'If your approaches finish an average of 22 feet from the hole, your proximity is 22 feet.',
    whyItMatters:
      'Closer proximity means shorter putts and more birdie chances. PGA Tour pros average around 35 feet from 150 yards.',
  },
  sgOffTee: {
    term: 'SG: Off the Tee',
    explanation:
      'How many shots you gain or lose with your tee shots compared to a scratch golfer baseline.',
    example:
      'A positive number means your driving is better than scratch level. A negative number means it is costing you shots.',
    whyItMatters:
      'Tee shot position sets up every hole. Losing shots off the tee makes every subsequent shot harder.',
  },
  sgApproach: {
    term: 'SG: Approach',
    explanation:
      'How many shots you gain or lose on approach shots to the green compared to scratch.',
    example:
      'If SG Approach is -3.2, your iron play is costing you 3.2 shots per round versus scratch.',
    whyItMatters:
      'Approach play is typically the biggest differentiator between handicap levels. Improving here has the biggest impact on scores.',
  },
  sgAroundGreen: {
    term: 'SG: Around the Green',
    explanation:
      'How many shots you gain or lose on shots from within 30 yards of the green, not including putts.',
    example: 'Chips, pitches, bunker shots, and flops all count here.',
    whyItMatters:
      'A strong short game saves pars and turns doubles into bogeys. It is the great equaliser for players who miss greens.',
  },
  sgPutting: {
    term: 'SG: Putting',
    explanation:
      'How many shots you gain or lose on the greens compared to scratch.',
    example:
      'If SG Putting is +1.5, you are holing more putts and leaving yourself shorter second putts than a scratch golfer would.',
    whyItMatters:
      'Putting accounts for roughly 40% of all shots in a round. Even small improvements here show up quickly in your scores.',
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
