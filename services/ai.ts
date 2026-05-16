import { UserProfile, Round, PracticePlan, DayOfWeek, WeaknessArea } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

function formatFacilities(facilities: string[]): string {
  const labels: Record<string, string> = {
    driving_range: 'Driving Range',
    putting_green: 'Putting Green',
    chipping_area: 'Chipping Area',
    full_course: 'Full Course Access',
    simulator: 'Golf Simulator',
    home_net: 'Home Net / Backyard',
  };
  if (!facilities || facilities.length === 0) return 'Driving Range (assumed)';
  return facilities.map((f) => labels[f] ?? f).join(', ');
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

export async function generatePracticePlan(
  profile: UserProfile,
  rounds: Round[],
  apiKey: string
): Promise<PracticePlan> {
  const rawDays = profile.practiceDaysPerWeek ?? 3;
  const practiceDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 5) : 3;
  const rawLength = profile.sessionLengthMinutes ?? 60;
  const sessionLength = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 60;
  const hoursPerWeek = Math.round((practiceDays * sessionLength) / 60);

  const systemPrompt = `You are an expert PGA-certified golf coach. Generate highly personalized, actionable practice plans based on the golfer's data. Always return valid JSON only — no explanations, no markdown, just raw JSON.`;

  const userPrompt = `Generate a personalized weekly golf practice plan for this player:

PLAYER PROFILE:
- Name: ${safeStr(profile.name, 60)}
- Current Handicap: ${profile.handicap}
- Target Handicap: ${profile.targetHandicap}
- Weaknesses: ${formatWeaknesses(profile.weaknesses)}
- Goals: ${profile.goals.map((g) => safeStr(g, 40)).join(', ')}
- Practice time available: ${hoursPerWeek} hours/week
- Available facilities: ${formatFacilities(profile.facilities ?? [])}
${Number.isFinite(profile.ballSpeed) && (profile.ballSpeed ?? 0) > 0 ? `- Ball Speed: ${profile.ballSpeed} mph` : ''}

IMPORTANT: Only generate drills that can be performed at the player's available facilities. Do not prescribe driving range drills if the player only has a putting green, etc.

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
