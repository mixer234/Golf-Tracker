/**
 * Strokes Gained calculation engine based on Mark Broadie's methodology
 * ("Every Shot Counts", Columbia Business School).
 *
 * Expected strokes tables are derived from PGA Tour shot-link data for
 * scratch-level baseline. All SG values represent strokes gained (positive)
 * or lost (negative) vs. a scratch golfer per shot.
 */

import { HoleScore, Round } from '../types';

// ─── Expected strokes lookup tables ──────────────────────────────────────────

// Putting: [distance_feet, expected_putts]
const PUTT_TABLE: [number, number][] = [
  [1, 1.000], [2, 1.005], [3, 1.021], [4, 1.059], [5, 1.117],
  [6, 1.180], [7, 1.243], [8, 1.299], [9, 1.348], [10, 1.389],
  [12, 1.454], [15, 1.536], [20, 1.635], [25, 1.707], [30, 1.762],
  [40, 1.835], [50, 1.879], [60, 1.906], [75, 1.935], [100, 1.970],
];

// Fairway: [distance_yards, expected_strokes_to_hole]
const FAIRWAY_TABLE: [number, number][] = [
  [10, 2.39], [20, 2.52], [30, 2.62], [40, 2.68], [50, 2.72],
  [75, 2.80], [100, 2.88], [125, 2.97], [150, 3.07], [175, 3.19],
  [200, 3.33], [225, 3.48], [250, 3.63], [275, 3.78], [300, 3.93],
  [325, 4.09], [350, 4.25], [400, 4.55], [450, 4.83],
];

// Rough: [distance_yards, expected_strokes_to_hole]
const ROUGH_TABLE: [number, number][] = [
  [10, 2.60], [20, 2.70], [30, 2.78], [40, 2.87], [50, 2.97],
  [75, 3.07], [100, 3.18], [125, 3.30], [150, 3.44], [175, 3.59],
  [200, 3.74], [225, 3.89], [250, 4.04], [300, 4.32],
];

// Greenside bunker (sand): [distance_yards, expected_strokes]
const SAND_TABLE: [number, number][] = [
  [5, 2.23], [10, 2.44], [20, 2.63], [30, 2.79],
  [40, 2.95], [50, 3.10], [75, 3.37], [100, 3.58],
];

// Around green from rough/fringe (chipping): [distance_yards, expected_strokes]
const CHIP_TABLE: [number, number][] = [
  [2, 2.12], [5, 2.30], [10, 2.49], [15, 2.62],
  [20, 2.72], [25, 2.80], [30, 2.87],
];

// Recovery (heavy rough, trees, unplayable-adjacent): [distance_yards, expected_strokes]
const RECOVERY_TABLE: [number, number][] = [
  [25, 3.20], [50, 3.50], [75, 3.65], [100, 3.80], [150, 4.00],
];

// Par-specific tee baseline expected strokes (scratch golfer)
const TEE_BASELINE: Record<3 | 4 | 5, number> = {
  3: 3.05,  // slightly above par 3 (scratch hits par 3 slightly over par)
  4: 3.95,  // scratch averages slightly under par on par 4s
  5: 4.75,  // scratch averages well under par on par 5s
};

// ─── Interpolation ───────────────────────────────────────────────────────────

function interpolate(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
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

// ─── Expected strokes accessors ──────────────────────────────────────────────

export type ShotLie = 'fairway' | 'rough' | 'sand' | 'recovery' | 'green' | 'fringe';

export function expectedStrokes(distanceYards: number, lie: ShotLie): number {
  switch (lie) {
    case 'green':    return interpolate(PUTT_TABLE, distanceYards * 3); // convert to feet approx
    case 'fairway':  return interpolate(FAIRWAY_TABLE, distanceYards);
    case 'sand':     return interpolate(SAND_TABLE, distanceYards);
    case 'recovery': return interpolate(RECOVERY_TABLE, distanceYards);
    case 'fringe':
    case 'rough':
      return distanceYards <= 30
        ? interpolate(CHIP_TABLE, distanceYards)
        : interpolate(ROUGH_TABLE, distanceYards);
  }
}

export function expectedPutts(distanceFeet: number): number {
  return interpolate(PUTT_TABLE, distanceFeet);
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

  // ── SG: Putting ──────────────────────────────────────────────────────────
  // Requires first putt distance. Formula: expected_putts(distance) - actual_putts
  if (hole.firstPuttDistanceFeet && hole.firstPuttDistanceFeet > 0 && hole.putts > 0) {
    const expPutts = expectedPutts(hole.firstPuttDistanceFeet);
    result.sgPutting = round2(expPutts - hole.putts);
  }

  // After-shot position: where we ended up on the green
  // If GIR, use first putt distance. If not GIR, estimate chip distance.
  const firstPuttFt = hole.firstPuttDistanceFeet ?? 20; // default 20ft if unknown
  const chipDistYds = 15; // default chip distance when missing green

  // ── SG: Around the Green ─────────────────────────────────────────────────
  // Only applies when GIR is missed and we have a chip/pitch/bunker shot.
  // Requires some distance info. We estimate from upAndDown success.
  if (!hole.greenInRegulation && hole.strokes > 0) {
    const lieFromGreenside: ShotLie = hole.sandSave ? 'sand' : 'rough';
    const estDistFromGreen = chipDistYds;

    const startExp = expectedStrokes(estDistFromGreen, lieFromGreenside);
    // After short game shot: we're on the green at firstPuttFt
    const endExp = expectedPutts(firstPuttFt);
    // Shots used around the green (strokes minus putts minus (non-approach shots))
    // For simplicity: around-green shots = (strokes - putts - (non-green shots before))
    // Estimate: 1 short-game shot expected, actual might be 1 (good) or 2 (bad)
    const aroundGreenShots = Math.max(1, hole.strokes - hole.putts - (hole.par - 2));
    result.sgAroundGreen = round2(startExp - endExp - aroundGreenShots);
  }

  // ── SG: Approach ─────────────────────────────────────────────────────────
  // Requires approach distance. Formula: expected_before - expected_after - 1
  if (hole.approachDistanceYards && hole.approachDistanceYards > 0) {
    const approachLie: ShotLie = hole.approachLie ?? (hole.fairwayHit ? 'fairway' : 'rough');
    const startExp = expectedStrokes(hole.approachDistanceYards, approachLie);

    let endExp: number;
    if (hole.greenInRegulation) {
      // Hit GIR: we're on the green at firstPuttFt
      endExp = expectedPutts(firstPuttFt);
    } else {
      // Missed GIR: ended up around the green
      const lieAfterMiss: ShotLie = hole.sandSave ? 'sand' : 'rough';
      endExp = expectedStrokes(chipDistYds, lieAfterMiss);
    }

    result.sgApproach = round2(startExp - endExp - 1);
  }

  // ── SG: Off the Tee ──────────────────────────────────────────────────────
  // Only on par 4s (par 5s are too complex without shot-by-shot data).
  // Uses: tee baseline expected - expected_at_approach_position - 1
  if (hole.par === 4 && hole.approachDistanceYards && hole.approachDistanceYards > 0) {
    const teeBaseline = TEE_BASELINE[4];
    const approachLie: ShotLie = hole.fairwayHit === true ? 'fairway'
      : hole.fairwayHit === false ? 'rough' : 'rough';
    const afterDriveExp = expectedStrokes(hole.approachDistanceYards, approachLie);
    result.sgOffTee = round2(teeBaseline - afterDriveExp - 1);
  }

  // On par 3: tee shot = approach shot. Merge into approach if no approachDist given.
  // On par 5: OTT skipped (would need 2nd shot distance separately).

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
