import { HoleScore, Round } from '../types';
import { calcScoreDifferential } from './whs';

// ─── Differential ────────────────────────────────────────────────────────────

/**
 * WHS scoring differential: (113 / slope) × (adjustedScore − courseRating).
 * Returns null when either rating is missing.
 */
export function calculateDifferential(
  totalScore: number,
  courseRating?: number,
  slopeRating?: number,
): number | null {
  if (courseRating == null || slopeRating == null) return null;
  return calcScoreDifferential(totalScore, courseRating, slopeRating);
}

/**
 * Returns true when the stored values match the default 72.0 / 113 placeholders,
 * meaning the user didn't supply real course data.
 */
export function usedDefaultRating(courseRating?: number, slopeRating?: number): boolean {
  return courseRating === 72 && slopeRating === 113;
}

/**
 * Returns true if this round's differential is a personal best (strictly lower
 * than every previous completed round's differential).
 * Pass the current round's id so it is excluded from the comparison set.
 */
export function isPB(diff: number, currentRoundId: string, allRounds: Round[]): boolean {
  const prev = allRounds
    .filter((r) => r.id !== currentRoundId && r.isComplete && r.scoreDifferential !== undefined)
    .map((r) => r.scoreDifferential as number);
  if (prev.length === 0) return true; // first round with a diff is always a PB
  return diff < Math.min(...prev);
}

// ─── Hole analysis ───────────────────────────────────────────────────────────

export interface HoleResult {
  hole: HoleScore;
  vsPar: number;
  /** How many additional holes are tied at the same vs-par value */
  tiedCount: number;
}

/**
 * Returns the hole with the lowest score vs par (best performance).
 * Only counts holes where strokes > 0 (actually played).
 */
export function getBestHole(holes: HoleScore[]): HoleResult | null {
  const played = holes.filter((h) => h.strokes > 0);
  if (played.length === 0) return null;
  const best = Math.min(...played.map((h) => h.strokes - h.par));
  const tied = played.filter((h) => h.strokes - h.par === best);
  return { hole: tied[0], vsPar: best, tiedCount: tied.length - 1 };
}

/**
 * Returns the hole with the highest score vs par (worst performance).
 * Only counts holes where strokes > 0.
 */
export function getWorstHole(holes: HoleScore[]): HoleResult | null {
  const played = holes.filter((h) => h.strokes > 0);
  if (played.length === 0) return null;
  const worst = Math.max(...played.map((h) => h.strokes - h.par));
  const tied = played.filter((h) => h.strokes - h.par === worst);
  return { hole: tied[0], vsPar: worst, tiedCount: tied.length - 1 };
}

/** Human-readable label for a vs-par integer value. */
export function vsParLabel(vsPar: number): string {
  if (vsPar <= -2) return 'Eagle';
  if (vsPar === -1) return 'Birdie';
  if (vsPar === 0) return 'Par';
  if (vsPar === 1) return 'Bogey';
  if (vsPar === 2) return 'Double Bogey';
  return 'Triple Bogey+';
}

// ─── Per-round stat helpers ───────────────────────────────────────────────────

/**
 * GIR percentage (0–100, whole number).
 * Returns null when no holes have been played.
 */
export function getGirPct(round: Round): number | null {
  const played = round.holes.filter((h) => h.strokes > 0).length;
  if (played === 0) return null;
  return Math.round((round.greensInRegulation / played) * 100);
}

/**
 * Fairway hit percentage (0–100, whole number).
 * Returns null when there are no par-4 or par-5 holes tracked.
 */
export function getFairwayPct(round: Round): number | null {
  if (round.fairwaysTotal === 0) return null;
  return Math.round((round.fairwaysHit / round.fairwaysTotal) * 100);
}

/**
 * Average putts per played hole, rounded to one decimal place.
 * Returns null when no holes have been played.
 */
export function getAvgPutts(round: Round): number | null {
  const played = round.holes.filter((h) => h.strokes > 0).length;
  if (played === 0 || round.totalPutts === 0) return null;
  return Math.round((round.totalPutts / played) * 10) / 10;
}

/**
 * Scrambling percentage (up-and-downs made / attempts, 0–100, whole number).
 * Returns null when there were no up-and-down opportunities.
 */
export function getScramblingPct(round: Round): number | null {
  if (round.upAndDownAttempts === 0) return null;
  return Math.round((round.upAndDowns / round.upAndDownAttempts) * 100);
}
