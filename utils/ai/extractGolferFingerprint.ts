import AsyncStorage from '@react-native-async-storage/async-storage';
import { GolferFingerprint, GolferTier, ConversationEntry } from '../../types/diagnostic';
import { UserProfile } from '../../types';
import { AI_CONFIG, hasValidApiKey } from '../../config/ai';

const ANTHROPIC_API_URL = AI_CONFIG.baseUrl;
const MODEL = AI_CONFIG.model;

export const FINGERPRINT_KEY = '@golf_golfer_fingerprint';
export const DIAGNOSTIC_SKIPPED_KEY = '@golf_diagnostic_skipped';
export const DIAGNOSTIC_REMINDER_KEY = '@golf_diagnostic_reminder_shown';

function formatConversation(history: ConversationEntry[]): string {
  return history.map((e, i) =>
    `Q${i + 1}: ${e.question}\nA${i + 1}: ${e.displayAnswer}`
  ).join('\n\n');
}

/** Build a basic fingerprint from raw answers without Claude (fallback) */
function buildBasicFingerprint(
  history: ConversationEntry[],
  tier: GolferTier,
  profile: UserProfile,
): GolferFingerprint {
  const allAnswers = history.map((e) => e.displayAnswer.toLowerCase()).join(' ');
  const allChips = history.flatMap((e) => e.answerChips ?? []).map((c) => c.toLowerCase());

  const has = (...terms: string[]) =>
    terms.some((t) => allAnswers.includes(t) || allChips.some((c) => c.includes(t)));

  const practiceEntry = history.find((e) => e.id?.includes('time') || e.question.toLowerCase().includes('hour'));
  const practiceHours = practiceEntry?.displayAnswer.includes('10') ? 10
    : practiceEntry?.displayAnswer.includes('6') || practiceEntry?.displayAnswer.includes('9') ? 7
    : practiceEntry?.displayAnswer.includes('3') || practiceEntry?.displayAnswer.includes('5') ? 4
    : practiceEntry?.displayAnswer.includes('1') || practiceEntry?.displayAnswer.includes('2') ? 1.5
    : 2;

  const seriousnessEntry = history.find((e) => e.question.toLowerCase().includes('serious') || e.id?.includes('seriousness'));
  const seriousness = seriousnessEntry?.displayAnswer ?? 'want to improve';

  const priorityAreas: string[] = [];
  if (has('driv', 'tee', 'driver', 'off the tee')) priorityAreas.push('Driver / Off the Tee');
  if (has('iron', 'approach', 'gir')) priorityAreas.push('Iron Play & Approach');
  if (has('putt')) priorityAreas.push('Putting');
  if (has('wedge', '100 yard', 'short game', 'chip')) priorityAreas.push('Wedges & Short Game');
  if (has('mental', 'pressure', 'nerv', 'anger', 'fear')) priorityAreas.push('Mental Game');
  if (has('course management', 'lay up', 'target')) priorityAreas.push('Course Management');
  if (has('bunker', 'sand')) priorityAreas.push('Bunker Play');
  if (priorityAreas.length === 0) priorityAreas.push('General Consistency');

  return {
    tier,
    completedAt: new Date().toISOString(),
    seriousnessLevel: seriousness,
    practiceHoursPerWeek: practiceHours,
    driverProfile: {
      issues: has('driv', 'tee') ? allChips.filter((c) => c.includes('driv') || c.includes('tee') || c.includes('slice') || c.includes('hook')) : [],
      typicalMiss: has('slice', 'fade', 'right') ? 'Right / Fade' : has('hook', 'pull', 'left') ? 'Left / Draw' : null,
      missShape: null,
      confidenceLevel: has('confident', 'strength', 'good') && !has('driv') ? 'high' : has('driv') ? 'low' : 'medium',
    },
    ironProfile: {
      issues: has('iron', 'approach') ? ['Inconsistent approach play'] : [],
      problemClubs: [],
      missPattern: has('left') ? ['Left'] : has('right') ? ['Right'] : has('short') ? ['Short'] : [],
      distanceControl: has('distance control', 'distance') ? 'poor' : 'ok',
      confidenceLevel: has('iron') ? 'low' : 'medium',
    },
    wedgeProfile: {
      issues: has('wedge', '100', 'short game') ? ['Distance control inside 100 yards'] : [],
      uncomfortableDistanceRange: null,
      bunkerConfidence: has('bunker', 'sand', 'bunker terrif') ? 'low' : 'medium',
      partialShotControl: has('partial', 'half') ? 'poor' : 'ok',
    },
    puttingProfile: {
      issues: has('putt', '3-putt', 'three-putt') ? ['Putting consistency'] : [],
      missPattern: has('pull', 'left') ? ['Left'] : has('push', 'right') ? ['Right'] : [],
      problemDistances: has('lag', 'long range') ? ['Long range'] : has('short putt', 'inside 6') ? ['Short range'] : [],
      pressurePutting: has('choke', 'putt nerv', 'short putts in comp') ? 'weakness' : 'neutral',
      speedControl: has('speed', 'pace', 'past', 'short') ? 'poor' : 'ok',
      confidenceLevel: has('putt') ? 'low' : 'medium',
    },
    shortGameProfile: {
      issues: has('chip', 'pitch', 'short game') ? ['Chipping & short game'] : [],
      problemLies: has('tight lie') ? ['Tight lies'] : has('rough') ? ['Rough'] : [],
      chippingConsistency: has('contact', 'chunk') ? 'poor' : 'ok',
    },
    mentalProfile: {
      issues: allChips.filter((c) =>
        c.includes('anger') || c.includes('nerv') || c.includes('focus') ||
        c.includes('over') || c.includes('fall apart') || c.includes('choke')
      ),
      pressureResponse: has('better with something on', 'play better') ? 'improves'
        : has('fall apart', 'lose 3', 'falls apart') ? 'declines'
        : 'neutral',
      specificFears: history.filter((e) => e.id?.includes('fear')).map((e) => e.displayAnswer).filter(Boolean),
      angerManagement: has('anger after bad', 'angry') ? 'issue' : 'neutral',
    },
    courseManagement: {
      issues: allChips.filter((c) =>
        c.includes('course management') || c.includes('lay up') || c.includes('target') || c.includes('aggressive')
      ),
      tendencies: has('aggressive') ? ['Too aggressive with driver'] : [],
    },
    priorityAreas,
    keyInsights: `${profile.name} is a ${profile.handicap} handicapper at the ${tier} level, focusing on ${priorityAreas.slice(0, 2).join(' and ')}.`,
    coachingApproach: tier === 'competitive' ? 'Direct and data-driven' : tier === 'mid' ? 'Encouraging with clear goals' : 'Patient and confidence-building',
  };
}

export async function extractGolferFingerprint(
  history: ConversationEntry[],
  tier: GolferTier,
  profile: UserProfile,
): Promise<GolferFingerprint> {
  // If no API key is available, build basic fingerprint from answers
  if (!hasValidApiKey()) {
    const fp = buildBasicFingerprint(history, tier, profile);
    await AsyncStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fp));
    return fp;
  }

  const conversationText = formatConversation(history);

  const systemPrompt = `You are extracting a structured coaching profile from a diagnostic conversation. Be precise and extract only what was actually said — do not infer or assume beyond the conversation. Always respond with valid JSON only.`;

  const userPrompt = `Extract a structured golfer profile from this diagnostic conversation.

Basic profile:
Handicap: ${profile.handicap}
Goals: ${profile.goals.join(', ')}
Facilities: ${(profile.facilities ?? []).join(', ')}
Experience: ${profile.experienceLevel}
Tier: ${tier}

Diagnostic conversation:
${conversationText}

Return ONLY this exact JSON structure (no markdown, no explanation):
{
  "tier": "${tier}",
  "completedAt": "${new Date().toISOString()}",
  "seriousnessLevel": "extracted from answers",
  "practiceHoursPerWeek": 3,
  "driverProfile": {
    "issues": [],
    "typicalMiss": null,
    "missShape": null,
    "confidenceLevel": "medium"
  },
  "ironProfile": {
    "issues": [],
    "problemClubs": [],
    "missPattern": [],
    "distanceControl": "ok",
    "confidenceLevel": "medium"
  },
  "wedgeProfile": {
    "issues": [],
    "uncomfortableDistanceRange": null,
    "bunkerConfidence": "medium",
    "partialShotControl": "ok"
  },
  "puttingProfile": {
    "issues": [],
    "missPattern": [],
    "problemDistances": [],
    "pressurePutting": "neutral",
    "speedControl": "ok",
    "confidenceLevel": "medium"
  },
  "shortGameProfile": {
    "issues": [],
    "problemLies": [],
    "chippingConsistency": "ok"
  },
  "mentalProfile": {
    "issues": [],
    "pressureResponse": "neutral",
    "specificFears": [],
    "angerManagement": "neutral"
  },
  "courseManagement": {
    "issues": [],
    "tendencies": []
  },
  "priorityAreas": ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5"],
  "keyInsights": "2-3 sentences a new coach would want to read before their first session.",
  "coachingApproach": "How to communicate with this player"
}

For priorityAreas: rank top 5 areas by impact on scores, most impactful first.
For keyInsights: 2-3 sentences for a new coach.
For coachingApproach: communication style based on seriousness and goals.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': AI_CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data = await response.json();
    const content = data.content?.[0]?.text ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed: GolferFingerprint = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    parsed.completedAt = new Date().toISOString();
    parsed.tier = tier;

    await AsyncStorage.setItem(FINGERPRINT_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    // Fall back to local extraction on any error
    const fp = buildBasicFingerprint(history, tier, profile);
    await AsyncStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fp));
    return fp;
  }
}

export async function loadFingerprint(): Promise<GolferFingerprint | null> {
  try {
    const raw = await AsyncStorage.getItem(FINGERPRINT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
