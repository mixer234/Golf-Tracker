import { UserProfile, Round, PracticePlan, DayOfWeek, WeaknessArea } from '../types';
import { GolferFingerprint } from '../types/diagnostic';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const ALL_FACILITIES = ['driving_range', 'putting_green', 'chipping_area', 'full_course', 'simulator', 'home_net'] as const;

const FACILITY_LABELS: Record<string, string> = {
  driving_range: 'Driving Range',
  putting_green: 'Putting Green',
  chipping_area: 'Chipping Area',
  full_course: 'Full Course Access',
  simulator: 'Golf Simulator',
  home_net: 'Home Net / Backyard',
};

function formatFacilities(facilities: string[]): string {
  if (!facilities || facilities.length === 0) return 'Driving Range';
  return facilities.map((f) => FACILITY_LABELS[f] ?? f).join(', ');
}

function formatMissingFacilities(facilities: string[]): string {
  const present = new Set(facilities ?? []);
  const missing = ALL_FACILITIES.filter((f) => !present.has(f));
  if (missing.length === 0) return 'None — all facilities available.';
  return missing.map((f) => FACILITY_LABELS[f]).join(', ');
}

function formatWeaknesses(weaknesses: WeaknessArea[]): string {
  const labels: Record<WeaknessArea, string> = {
    driving: 'Driver / Tee Shots',
    long_irons: 'Long Irons (2-5)',
    mid_irons: 'Mid Irons (6-8)',
    short_irons: 'Short Irons (9-PW)',
    wedges: 'Wedge Play',
    bunkers: 'Bunker Shots',
    chipping: 'Chipping & Pitching',
    putting: 'Putting',
    mental: 'Mental Game',
    course_management: 'Course Management',
  };
  return weaknesses.map((w) => labels[w]).join(', ');
}

function formatRecentRounds(rounds: Round[]): string {
  if (rounds.length === 0) return 'No rounds recorded yet.';
  return rounds
    .slice(0, 5)
    .map((r) => {
      const date = new Date(r.date).toLocaleDateString();
      const stp = r.scoreToPar;
      const score = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);
      const udLine = r.upAndDownAttempts > 0
        ? `, ${Math.round((r.upAndDowns / r.upAndDownAttempts) * 100)}% U&D`
        : '';
      const penLine = r.totalPenalties > 0 ? `, ${r.totalPenalties} penalties` : '';
      const diffLine = r.scoreDifferential !== undefined ? `, differential ${r.scoreDifferential}` : '';
      return `- ${date} at ${safeStr(r.courseName, 60)}: ${r.totalScore} (${score}), ${r.greensInRegulation}/18 GIR, ${r.fairwaysHit}/${r.fairwaysTotal} FW, ${r.totalPutts} putts${udLine}${penLine}${diffLine}`;
    })
    .join('\n');
}

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Strip newlines and control chars from user-supplied strings before prompt interpolation.
function safeStr(s: string, maxLen = 120): string {
  return s.replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').trim().slice(0, maxLen);
}

function formatFingerprint(fp: GolferFingerprint): string {
  const lines = [
    'DETAILED COACHING PROFILE (from game assessment):',
    `Priority areas (most impactful first): ${fp.priorityAreas.join(', ')}`,
    `Driver: ${[...fp.driverProfile.issues, fp.driverProfile.typicalMiss].filter(Boolean).join(', ') || 'No specific issues noted'}`,
    `Irons: ${[...fp.ironProfile.issues, ...fp.ironProfile.problemClubs, ...fp.ironProfile.missPattern].filter(Boolean).join(', ') || 'No specific issues noted'}`,
    `Wedges: ${[...fp.wedgeProfile.issues, fp.wedgeProfile.uncomfortableDistanceRange ? `Uncomfortable ${fp.wedgeProfile.uncomfortableDistanceRange.from}–${fp.wedgeProfile.uncomfortableDistanceRange.to} yards` : null].filter(Boolean).join(', ') || 'No specific issues noted'}`,
    `Putting: ${[...fp.puttingProfile.issues, ...fp.puttingProfile.missPattern, ...fp.puttingProfile.problemDistances].filter(Boolean).join(', ') || 'No specific issues noted'}`,
    `Short game: ${fp.shortGameProfile.issues.join(', ') || 'No specific issues noted'}`,
    `Mental: ${[...fp.mentalProfile.issues, ...fp.mentalProfile.specificFears].filter(Boolean).join(', ') || 'No specific issues noted'}`,
    `Key coaching insight: ${fp.keyInsights}`,
    `Communication style: ${fp.coachingApproach}`,
    '',
    'The practice plan MUST address the top priority area with at least 2 drills. Every drill should reference the specific issue it addresses from the profile above.',
  ];
  return lines.join('\n');
}

export async function generatePracticePlan(
  profile: UserProfile,
  rounds: Round[],
  apiKey: string,
  fingerprint?: GolferFingerprint | null,
  sessionLengthOverride?: number,
): Promise<PracticePlan> {
  const rawDays = profile.practiceDaysPerWeek ?? 3;
  const practiceDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 5) : 3;
  const rawLength = sessionLengthOverride ?? profile.sessionLengthMinutes ?? 60;
  const sessionLength = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 60;
  const hoursPerWeek = Math.round((practiceDays * sessionLength) / 60);

  const playerFacilities = profile.facilities && profile.facilities.length > 0
    ? profile.facilities
    : ['driving_range'];

  const systemPrompt = `You are an expert PGA-certified golf coach. Generate highly personalized, actionable practice plans based on the golfer's data. Always return valid JSON only — no explanations, no markdown, just raw JSON.

STRICT FACILITY RULE — This overrides all other instructions:
The player ONLY has access to the following facilities: ${formatFacilities(playerFacilities)}.
You MUST NOT prescribe any drill that requires a facility not in that list.
Every drill's "facility" field MUST be one of: driving_range, putting_green, chipping_area, full_course, simulator, home_net, anywhere.
Facility definitions:
- driving_range: Full-swing practice hitting balls with visible ball flight (outdoors or covered range bay).
- putting_green: Dedicated green surface with real holes for putting practice.
- chipping_area: Short-game area for chips, pitches, and bunker shots within 50 yards.
- full_course: A real golf course — use for on-course drills and playing lessons.
- simulator: Indoor launch monitor or simulator bay — can replicate driving range drills.
- home_net: Backyard net or indoor space for swing training without ball flight visibility.
- anywhere: No facility required — mental, stretching, or video-review drills.`;

  const userPrompt = `Generate a personalized weekly golf practice plan for this player:

PLAYER PROFILE:
- Name: ${safeStr(profile.name, 60)}
- Current Handicap: ${profile.handicap}
- Target Handicap: ${profile.targetHandicap}
- Weaknesses: ${formatWeaknesses(profile.weaknesses)}
- Goals: ${profile.goals.map((g) => safeStr(g, 40)).join(', ')}
- Practice time available: ${hoursPerWeek} hours/week (${practiceDays} days × ${sessionLength} min)
- Available facilities: ${formatFacilities(playerFacilities)}
- Facilities NOT available (do NOT prescribe drills for these): ${formatMissingFacilities(playerFacilities)}
${Number.isFinite(profile.ballSpeed) && (profile.ballSpeed ?? 0) > 0 ? `- Ball Speed: ${profile.ballSpeed} mph` : ''}
SESSION LENGTH: ${sessionLength} minutes per session.
Count drill durations carefully:
- 15 min: 2–3 short drills (4–6 mins each)
- 30 min: 3–4 drills (6–8 mins each)
- 45 min: 4–5 drills (7–9 mins each)
- 60 min: 5–6 drills (8–10 mins each)
- 90 min: 6–8 drills (10–12 mins each)
The total duration of all drills in each day MUST sum to exactly ${sessionLength} minutes. Do not exceed this.
${fingerprint ? '\n' + formatFingerprint(fingerprint) + '\n' : ''}
RECENT PERFORMANCE (last 5 rounds):
${formatRecentRounds(rounds)}

Create a ${practiceDays}-day practice plan. Return ONLY this exact JSON structure:
{
  "focusAreas": ["weakness_key1", "weakness_key2"],
  "days": [
    {
      "day": "Monday",
      "duration": 60,
      "theme": "Short description of today's focus",
      "drills": [
        {
          "id": "unique_id_here",
          "name": "Drill Name",
          "description": "One sentence description",
          "duration": 15,
          "category": "putting",
          "difficulty": "intermediate",
          "facility": "putting_green",
          "equipment": ["item1", "item2"],
          "instructions": ["Step 1", "Step 2", "Step 3"],
          "focusPoints": ["Key focus 1", "Key focus 2"]
        }
      ],
      "completedDrillIds": []
    }
  ]
}

Valid category values: driving, long_irons, mid_irons, short_irons, wedges, bunkers, chipping, putting, mental, course_management
Valid difficulty values: beginner, intermediate, advanced
Valid facility values: driving_range, putting_green, chipping_area, full_course, simulator, home_net, anywhere
REMINDER: Only use facility values from the player's available facilities list above, or "anywhere".
Allocate practice time proportionally based on weaknesses. Each day should have 3-5 drills totaling the day's duration.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as any)?.error?.message ?? `API error ${response.status}`
    );
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  let parsed: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    throw new Error('Failed to parse practice plan from AI response');
  }

  const plan: PracticePlan = {
    id: Date.now().toString(36),
    generatedAt: new Date().toISOString(),
    weekOf: getStartOfWeek(),
    focusAreas: parsed.focusAreas ?? profile.weaknesses.slice(0, 3),
    days: parsed.days ?? [],
    aiGenerated: true,
  };

  return plan;
}
