/**
 * Strokes Gained calculation engine based on Mark Broadie's methodology
 * ("Every Shot Counts", Columbia Business School).
 *
 * Expected strokes tables are imported from /data/strokesGainedBaseline.ts.
 * All SG values represent strokes gained (positive) or lost (negative)
 * vs. a scratch golfer per shot.
 */

import { HoleScore, Round } from '../types';
import {
  PUTT_BASELINE,
  FAIRWAY_BASELINE,
  ROUGH_BASELINE,
  FRINGE_BASELINE,
  SAND_BASELINE,
  RECOVERY_BASELINE,
  TEE_BASELINE,
  PAR_TEE_BASELINE,
} from '../data/strokesGainedBaseline';

// ─── Interpolation ────────────────────────────────────────────────────────────

function interpolate(table: [number, number][], x: number): number {
  if (table.length === 0) return 0;
  if (!Number.isFinite(x) || x <= table[0][0]) return table[0][1];
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1];

  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i];
    const [x1, y1] = table[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

// ─── Expected strokes accessors ───────────────────────────────────────────────

export type ShotLie = 'fairway' | 'rough' | 'sand' | 'recovery' | 'green' | 'fringe';

export function expectedStrokes(distanceYards: number, lie: ShotLie): number {
  switch (lie) {
    case 'green':    return interpolate(PUTT_BASELINE, distanceYards * 3);
    case 'fairway':  return interpolate(FAIRWAY_BASELINE, distanceYards);
    case 'sand':     return interpolate(SAND_BASELINE, distanceYards);
    case 'recovery': return interpolate(RECOVERY_BASELINE, distanceYards);
    case 'fringe':
    case 'rough':
      return distanceYards <= 30
        ? interpolate(FRINGE_BASELINE, distanceYards)
        : interpolate(ROUGH_BASELINE, distanceYards);
  }
}

export function expectedPutts(distanceFeet: number): number {
  return interpolate(PUTT_BASELINE, distanceFeet);
}

/**
 * Expected strokes from tee for the given hole distance.
 * Uses Broadie Table 5.2 distance-based lookup when yardage is available;
 * falls back to par-based baseline when yardage is unknown.
 */
export function expectedTeeStrokes(
  holeDistanceYards: number | undefined,
  par: 3 | 4 | 5
): number {
  if (holeDistanceYards && holeDistanceYards > 0 && isFinite(holeDistanceYards)) {
    return interpolate(TEE_BASELINE, holeDistanceYards);
  }
  // Fall back to par-based baseline; default to par-4 value if par is unexpected.
  return PAR_TEE_BASELINE[par] ?? PAR_TEE_BASELINE[4];
}

// ─── Per-hole SG calculations ─────────────────────────────────────────────────

export interface HoleSG {
  holeNumber: number;
  sgPutting: number | null;
  sgApproach: number | null;
  sgAroundGreen: number | null;
  sgOffTee: number | null;
}

export function calcHoleSG(hole: HoleScore): HoleSG {
  const result: HoleSG = {
    holeNumber: hole.holeNumber,
    sgPutting: null,
    sgApproach: null,
    sgAroundGreen: null,
    sgOffTee: null,
  };

  if (hole.strokes === 0) return result;

  const firstPuttFt = hole.firstPuttDistanceFeet ?? 20;
  const chipDistYds = 15;

  // ── SG: Putting ──────────────────────────────────────────────────────────
  if (hole.firstPuttDistanceFeet && hole.firstPuttDistanceFeet > 0 && hole.putts > 0) {
    const expPutts = expectedPutts(hole.firstPuttDistanceFeet);
    result.sgPutting = round2(expPutts - hole.putts);
  }

  // ── SG: Around the Green ─────────────────────────────────────────────────
  if (!hole.greenInRegulation && hole.strokes > 0) {
    const lieFromGreenside: ShotLie = hole.sandSave ? 'sand' : 'rough';
    const startExp = expectedStrokes(chipDistYds, lieFromGreenside);
    const endExp = expectedPutts(firstPuttFt);
    const aroundGreenShots = Math.max(1, hole.strokes - hole.putts - (hole.par - 2));
    result.sgAroundGreen = round2(startExp - endExp - aroundGreenShots);
  }

  // ── SG: Approach ─────────────────────────────────────────────────────────
  if (hole.approachDistanceYards && hole.approachDistanceYards > 0) {
    const approachLie: ShotLie = hole.approachLie ?? (hole.fairwayHit ? 'fairway' : 'rough');
    const startExp = expectedStrokes(hole.approachDistanceYards, approachLie);

    let endExp: number;
    if (hole.greenInRegulation) {
      endExp = expectedPutts(firstPuttFt);
    } else {
      const lieAfterMiss: ShotLie = hole.sandSave ? 'sand' : 'rough';
      endExp = expectedStrokes(chipDistYds, lieAfterMiss);
    }

    result.sgApproach = round2(startExp - endExp - 1);
  }

  // ── SG: Off the Tee ──────────────────────────────────────────────────────
  // Uses hole yardage (from course data) when available for better accuracy;
  // falls back to par-based baseline otherwise.
  // Only calculated on par 4s and par 5s (par 3 tee shot = approach shot).
  if ((hole.par === 4 || hole.par === 5) && hole.approachDistanceYards && hole.approachDistanceYards > 0) {
    const teeBaseline = expectedTeeStrokes(hole.holeDistanceYards, hole.par);
    const approachLie: ShotLie = hole.fairwayHit === true ? 'fairway' : 'rough';
    const afterDriveExp = expectedStrokes(hole.approachDistanceYards, approachLie);
    result.sgOffTee = round2(teeBaseline - afterDriveExp - 1);
  }

  return result;
}

// ─── Round-level SG aggregates ────────────────────────────────────────────────

export interface RoundSG {
  sgPutting: number;
  sgApproach: number;
  sgAroundGreen: number;
  sgOffTee: number;
  sgTotal: number;
  holesWithPutting: number;
  holesWithApproach: number;
  holesWithAroundGreen: number;
  holesWithOffTee: number;
}

export function calcRoundSG(holes: HoleScore[]): RoundSG | null {
  const holeSGs = holes.filter((h) => h.strokes > 0).map(calcHoleSG);

  const sum = (key: keyof HoleSG) => {
    const vals = holeSGs.map((h) => h[key] as number | null).filter((v): v is number => v !== null);
    return { total: vals.reduce((a, b) => a + b, 0), count: vals.length };
  };

  const putt = sum('sgPutting');
  const app = sum('sgApproach');
  const arg = sum('sgAroundGreen');
  const ott = sum('sgOffTee');

  if (putt.count + app.count + arg.count + ott.count === 0) return null;

  return {
    sgPutting: round2(putt.total),
    sgApproach: round2(app.total),
    sgAroundGreen: round2(arg.total),
    sgOffTee: round2(ott.total),
    sgTotal: round2(putt.total + app.total + arg.total + ott.total),
    holesWithPutting: putt.count,
    holesWithApproach: app.count,
    holesWithAroundGreen: arg.count,
    holesWithOffTee: ott.count,
  };
}

// ─── Multi-round SG averages ──────────────────────────────────────────────────

export interface SGAverages {
  sgPutting: number;
  sgApproach: number;
  sgAroundGreen: number;
  sgOffTee: number;
  sgTotal: number;
  roundCount: number;
}

export function calcSGAverages(rounds: Round[]): SGAverages | null {
  const withSG = rounds.filter(
    (r) => r.isComplete && r.sgTotal !== undefined && r.sgTotal !== null
  );
  if (withSG.length === 0) return null;

  const avg = (key: keyof Round) => {
    const vals = withSG
      .map((r) => r[key] as number | undefined)
      .filter((v): v is number => v !== undefined && !isNaN(v));
    if (vals.length === 0) return 0;
    return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return {
    sgPutting: avg('sgPutting'),
    sgApproach: avg('sgApproach'),
    sgAroundGreen: avg('sgAroundGreen'),
    sgOffTee: avg('sgOffTee'),
    sgTotal: avg('sgTotal'),
    roundCount: withSG.length,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
