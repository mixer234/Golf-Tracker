import { GolferTier } from '../../types/diagnostic';

export interface TierInputs {
  handicap: number;
  practiceHoursPerWeek: number;
  seriousnessLevel: 'just_for_fun' | 'want_to_improve' | 'very_serious' | 'competitive';
  goals: string[];
}

export const determineGolferTier = (inputs: TierInputs): GolferTier => {
  const { handicap, practiceHoursPerWeek, seriousnessLevel, goals } = inputs;

  // Handicap score
  let score = 0;
  if (handicap >= 28) score += 1;
  else if (handicap >= 15) score += 2;
  else if (handicap >= 8) score += 3;
  else score += 4;

  // Seriousness score
  if (seriousnessLevel === 'just_for_fun') score += 1;
  else if (seriousnessLevel === 'want_to_improve') score += 2;
  else if (seriousnessLevel === 'very_serious') score += 3;
  else score += 4; // competitive

  // Practice time score
  if (practiceHoursPerWeek < 1) score += 1;
  else if (practiceHoursPerWeek < 3) score += 2;
  else if (practiceHoursPerWeek < 6) score += 3;
  else score += 4;

  // Goals bonus
  const goalStr = goals.join(' ').toLowerCase();
  if (goalStr.includes('tournament') || goalStr.includes('competitive')) score += 1;
  if (goalStr.includes('lower_handicap') || goalStr.includes('lower handicap')) score += 1;

  if (score <= 6) return 'beginner';
  if (score <= 10) return 'mid';
  return 'competitive';
};

/** Map handicap to an initial tier estimate before asking seriousness questions */
export const estimateTierFromHandicap = (handicap: number): GolferTier => {
  if (handicap >= 25) return 'beginner';
  if (handicap >= 12) return 'mid';
  return 'competitive';
};
