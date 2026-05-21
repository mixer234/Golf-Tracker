import { GolferTier, DiagnosticQuestion } from '../../types/diagnostic';

const BEGINNER_QUESTIONS: DiagnosticQuestion[] = [
  // Phase 1
  {
    id: 'b_p1_frequency',
    phase: 1,
    text: "How often do you get out to play or practice?",
    inputType: 'chips',
    chipOptions: ['Once a month or less', 'A few times a month', 'Once a week', 'Multiple times a week'],
    area: 'frequency',
  },
  {
    id: 'b_p1_goal',
    phase: 1,
    text: "What's your main goal with golf right now?",
    inputType: 'chips',
    chipOptions: ['Just enjoy it', 'Play without embarrassment', 'Break 100', 'Break 90', 'Just get better'],
    area: 'goal',
  },
  // Phase 2
  {
    id: 'b_p2_frustration',
    phase: 2,
    text: "What frustrates you most when you're out on the course?",
    inputType: 'mixed',
    chipOptions: ['Topping the ball', 'Big slices', 'Chunking shots', '3 putting', "Can't get off the tee", 'Short game let me down', 'Everything feels inconsistent'],
    multiSelect: true,
    placeholder: "Describe what frustrates you most...",
    area: 'pain_point',
  },
  // Phase 3
  {
    id: 'b_p3_ballfligh',
    phase: 3,
    text: "When you hit a bad shot, where does your ball typically end up?",
    inputType: 'visual_grid',
    area: 'ball_flight',
  },
  {
    id: 'b_p3_putting',
    phase: 3,
    text: "How do you find putting?",
    inputType: 'chips',
    chipOptions: ['Speed is the problem — too far past or short', 'Direction — I pull or push putts', 'Short putts make me nervous', 'I 3-putt a lot from long range', 'Putting is actually my strength'],
    area: 'putting',
  },
  {
    id: 'b_p3_short_game',
    phase: 3,
    text: "What about getting onto the green from close by?",
    inputType: 'chips',
    chipOptions: ['I struggle to make clean contact', "I can't judge distance", 'Bunkers terrify me', "I'm OK close to the green"],
    area: 'short_game',
  },
  // Phase 4
  {
    id: 'b_p4_other',
    phase: 4,
    text: "Anything else your coach should know about your game?",
    inputType: 'text',
    skippable: true,
    placeholder: "e.g. any specific struggles or goals...",
    area: 'other',
  },
];

const MID_QUESTIONS: DiagnosticQuestion[] = [
  // Phase 1
  {
    id: 'm_p1_seriousness',
    phase: 1,
    text: "How serious are you about improving right now?",
    inputType: 'chips',
    chipOptions: ['I want to improve but keep it fun', "I'm genuinely committed to getting better", "I'm working hard at my game", "I'm training to compete"],
    area: 'seriousness',
  },
  {
    id: 'm_p1_time',
    phase: 1,
    text: "How many hours a week can you realistically practice — range, putting green, short game, gym?",
    inputType: 'chips',
    chipOptions: ['Under 1 hour', '1–2 hours', '3–4 hours', '5+ hours'],
    area: 'practice_time',
  },
  // Phase 2
  {
    id: 'm_p2_fix_one',
    phase: 2,
    text: "If you could fix ONE thing about your game tomorrow, what would it be?",
    inputType: 'mixed',
    chipOptions: ['Driver consistency', 'Iron striking', 'Wedge distances', 'Short game', 'Putting', 'Course management', 'Mental game'],
    placeholder: "Or describe it in your own words...",
    area: 'pain_point',
  },
  // Phase 3
  {
    id: 'm_p3_irons',
    phase: 3,
    text: "Let's talk about your iron game. Where do your approach shots typically miss?",
    inputType: 'visual_grid',
    multiSelect: true,
    area: 'irons',
  },
  {
    id: 'm_p3_clubs',
    phase: 3,
    text: "Which clubs give you the most trouble?",
    inputType: 'visual_clubs',
    multiSelect: true,
    area: 'problem_clubs',
  },
  {
    id: 'm_p3_putting',
    phase: 3,
    text: "How's your putting? Where does it break down?",
    inputType: 'chips',
    chipOptions: ['Speed — I leave putts short or blast them past', 'Lag putting from long range', 'Mid-range 10–20 feet', 'Short putts inside 6 feet', 'I pull putts left', 'I push putts right', 'Direction is fine, pace is the issue'],
    multiSelect: true,
    area: 'putting',
  },
  {
    id: 'm_p3_pressure',
    phase: 3,
    text: "What happens to your game under pressure or in a competition?",
    inputType: 'chips',
    chipOptions: ['I actually play better with something on it', 'Gets a bit tight but manageable', 'I lose 3–5 shots vs normal rounds', 'My game falls apart completely', "I don't play competitively"],
    area: 'mental',
  },
  {
    id: 'm_p3_wedges',
    phase: 3,
    text: "How do you find wedge play inside 100 yards?",
    inputType: 'visual_yardage',
    chipOptions: ['Bunker shots', 'Flop shots', 'Tight lies', "I'm solid inside 100"],
    multiSelect: true,
    area: 'wedges',
  },
  // Phase 4
  {
    id: 'm_p4_other',
    phase: 4,
    text: "Anything specific your coach should focus on that we haven't covered?",
    inputType: 'text',
    skippable: true,
    placeholder: "Any specific shots, courses, or situations...",
    area: 'other',
  },
];

const COMPETITIVE_QUESTIONS: DiagnosticQuestion[] = [
  // Phase 1
  {
    id: 'c_p1_level',
    phase: 1,
    text: "What level do you compete at?",
    inputType: 'chips',
    chipOptions: ['Club competitions (medal, stableford)', 'County or regional level', 'National amateur level', 'Semi-professional / mini tour', "I don't compete — I just train hard"],
    area: 'competition_level',
  },
  {
    id: 'c_p1_time',
    phase: 1,
    text: "How many hours a week do you practice (including all areas of the game)?",
    inputType: 'chips',
    chipOptions: ['Under 3hrs', '3–5hrs', '6–9hrs', '10hrs+'],
    area: 'practice_time',
  },
  // Phase 2
  {
    id: 'c_p2_losses',
    phase: 2,
    text: "Based on your last 10 rounds, where do you think you lose the most shots vs your potential?",
    inputType: 'mixed',
    chipOptions: ['Off the tee', 'Approach play', 'Around the green', 'Putting', 'Course management', 'Mental game', 'Wedge distances', 'Specific clubs'],
    placeholder: "Describe where you're leaking shots...",
    multiSelect: true,
    area: 'pain_point',
  },
  // Phase 3
  {
    id: 'c_p3_driver',
    phase: 3,
    text: "Let's look at your driving. What's your typical miss off the tee?",
    inputType: 'visual_grid',
    area: 'driver',
  },
  {
    id: 'c_p3_irons',
    phase: 3,
    text: "Iron play — where do you miss greens most? Tap all zones that apply.",
    inputType: 'visual_grid',
    multiSelect: true,
    area: 'irons',
  },
  {
    id: 'c_p3_putting',
    phase: 3,
    text: "Talk to me about your putting. Where does it break down?",
    inputType: 'chips',
    chipOptions: ['Inside 6ft — short game nerves', '6–15ft — mid range misses', '15–30ft — speed control', '30ft+ — lag putting', 'I rarely 3-putt', 'Green reading breaks me down', 'Pace changes on different courses', 'Short putts in competition'],
    multiSelect: true,
    area: 'putting',
  },
  {
    id: 'c_p3_wedges',
    phase: 3,
    text: "Wedge game — what's your biggest gap inside 125 yards?",
    inputType: 'visual_yardage',
    chipOptions: ['Partial shots', 'Bunker play', 'Tight lies', 'Flop shots', 'Spin control', 'Wedge gaps between clubs'],
    multiSelect: true,
    area: 'wedges',
  },
  {
    id: 'c_p3_mental',
    phase: 3,
    text: "Mental game and course management — what applies to you?",
    inputType: 'chips',
    chipOptions: ['Anger after bad shots', 'Slow starter', 'Fall apart after double bogey', 'Overthink swing', 'Nerves on first tee', 'Choke on short putts', 'Lose focus mid-round', 'Too aggressive with driver', 'Wrong club selection', "Don't know when to lay up", 'Poor target selection', 'Solid mentally', 'Course management is a strength'],
    multiSelect: true,
    area: 'mental',
  },
  {
    id: 'c_p3_fear',
    phase: 3,
    text: "Is there a specific shot or situation on the course that you genuinely fear or avoid?",
    inputType: 'text',
    skippable: true,
    placeholder: "e.g. tight driving holes, downhill putts, shots over water, bunker shots...",
    area: 'fears',
  },
  // Phase 4
  {
    id: 'c_p4_other',
    phase: 4,
    text: "Anything else about your game your coach needs to know to help you most?",
    inputType: 'text',
    skippable: true,
    placeholder: "Any details that would help your coach...",
    area: 'other',
  },
];

export const getQuestionsForTier = (tier: GolferTier): DiagnosticQuestion[] => {
  if (tier === 'beginner') return BEGINNER_QUESTIONS;
  if (tier === 'mid') return MID_QUESTIONS;
  return COMPETITIVE_QUESTIONS;
};

export const getMaxQuestions = (tier: GolferTier): number => {
  if (tier === 'beginner') return 8;
  if (tier === 'mid') return 11;
  return 13;
};
