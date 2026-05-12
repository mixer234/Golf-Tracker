import { UserProfile, Round, Course } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSystemPrompt(profile: UserProfile, rounds: Round[], courses: Course[]): string {
  const recentRounds = rounds.slice(0, 10);
  const avgScore = recentRounds.length > 0
    ? (recentRounds.reduce((s, r) => s + r.totalScore, 0) / recentRounds.length).toFixed(1)
    : 'N/A';
  const avgGIR = recentRounds.length > 0
    ? (recentRounds.reduce((s, r) => s + r.greensInRegulation, 0) / recentRounds.length).toFixed(1)
    : 'N/A';
  const avgPutts = recentRounds.length > 0
    ? (recentRounds.reduce((s, r) => s + r.totalPutts, 0) / recentRounds.length).toFixed(1)
    : 'N/A';

  const roundsSummary = recentRounds.slice(0, 5).map((r) => {
    const stp = r.scoreToPar;
    const parStr = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : `${stp}`;
    const sgLine = r.sgTotal !== undefined
      ? ` | SG: OTT ${r.sgOffTee?.toFixed(2) ?? '—'}, APP ${r.sgApproach?.toFixed(2) ?? '—'}, ARG ${r.sgAroundGreen?.toFixed(2) ?? '—'}, PUT ${r.sgPutting?.toFixed(2) ?? '—'}`
      : '';
    const mentalLine = r.mentalCommitment
      ? ` | Mental: ${r.mentalCommitment}/5 commitment, ${r.mentalControl}/5 control`
      : '';
    return `- ${new Date(r.date).toLocaleDateString()} @ ${r.courseName}: ${r.totalScore} (${parStr}), ${r.greensInRegulation}/18 GIR, ${r.totalPutts} putts${sgLine}${mentalLine}`;
  }).join('\n');

  const coursesSummary = courses.length > 0
    ? courses.map((c) => {
        const totalPar = c.holes.reduce((s, h) => s + h.par, 0);
        return `- ${c.name}${c.city ? ` (${c.city})` : ''}: par ${totalPar}${c.courseRating ? `, rating ${c.courseRating}` : ''}${c.slopeRating ? `, slope ${c.slopeRating}` : ''}`;
      }).join('\n')
    : 'No courses saved yet.';

  return `You are an expert PGA-certified golf coach and caddie AI. You know the game deeply — from mechanics to mental game to course management to Strokes Gained methodology.

PLAYER PROFILE:
- Name: ${profile.name}
- Handicap: ${profile.handicap} (target: ${profile.targetHandicap})
- Experience: ${profile.experienceLevel}
- Weaknesses: ${profile.weaknesses.join(', ')}
- Strengths: ${profile.strengths.join(', ')}
- Miss tendencies: ${profile.missTendencies.join(', ')}
- Goals: ${profile.goals.join(', ')}
${profile.avgDrivingDistance ? `- Avg driving distance: ${profile.avgDrivingDistance} yards` : ''}
${profile.ballSpeed ? `- Ball speed: ${profile.ballSpeed} mph` : ''}
${profile.shotShape ? `- Shot shape: ${profile.shotShape}` : ''}

RECENT STATS (last ${recentRounds.length} rounds):
- Avg score: ${avgScore}
- Avg GIR: ${avgGIR}/18
- Avg putts: ${avgPutts}

RECENT ROUNDS:
${roundsSummary || 'No rounds recorded yet.'}

SAVED COURSES:
${coursesSummary}

Your role:
- Give concise, actionable advice tailored specifically to this player's data
- Reference their actual stats and patterns when relevant
- Be direct — like a caddie on the bag, not a generic chatbot
- Use Strokes Gained thinking to prioritize where improvement has the highest ROI
- Keep responses focused and practical; avoid walls of text
- Encourage progress but be honest about weaknesses`;
}

export async function sendCoachMessage(
  messages: CoachMessage[],
  profile: UserProfile,
  rounds: Round[],
  courses: Course[],
  apiKey: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(profile, rounds, courses);

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
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any)?.error?.message ?? `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}
