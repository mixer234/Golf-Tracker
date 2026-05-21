/**
 * Strokes Gained baseline tables derived from Mark Broadie's methodology
 * ("Every Shot Counts", Columbia Business School Publishing).
 *
 * Expected strokes values represent the number of strokes a scratch golfer
 * (0 handicap index) takes to hole out from a given distance and lie.
 * All distances are in yards unless noted.
 *
 * Sources: Broadie Table 5.2 and surrounding analysis from PGA Tour ShotLink data.
 */

// ─── [distance, expectedStrokes] tuple type ───────────────────────────────────

export type BaselineEntry = [number, number];

// ─── Putting (distance in FEET) ───────────────────────────────────────────────
// Scratch baseline from 1 to 100 feet.

export const PUTT_BASELINE: BaselineEntry[] = [
  [1, 1.000],
  [2, 1.005],
  [3, 1.021],
  [4, 1.059],
  [5, 1.117],
  [6, 1.180],
  [7, 1.243],
  [8, 1.299],
  [9, 1.348],
  [10, 1.389],
  [11, 1.424],
  [12, 1.454],
  [14, 1.501],
  [15, 1.536],
  [17, 1.571],
  [20, 1.635],
  [25, 1.707],
  [30, 1.762],
  [35, 1.805],
  [40, 1.835],
  [45, 1.859],
  [50, 1.879],
  [60, 1.906],
  [75, 1.935],
  [100, 1.970],
];

// ─── Fairway (distance in yards) ─────────────────────────────────────────────
// Expected strokes to hole from fairway lie.

export const FAIRWAY_BASELINE: BaselineEntry[] = [
  [5,   2.30],
  [10,  2.39],
  [15,  2.46],
  [20,  2.52],
  [25,  2.57],
  [30,  2.62],
  [40,  2.68],
  [50,  2.72],
  [60,  2.76],
  [75,  2.80],
  [100, 2.88],
  [125, 2.97],
  [150, 3.07],
  [175, 3.19],
  [200, 3.33],
  [225, 3.48],
  [250, 3.63],
  [275, 3.78],
  [300, 3.93],
  [325, 4.09],
  [350, 4.25],
  [400, 4.55],
  [450, 4.83],
  [500, 5.10],
];

// ─── Rough (distance in yards) ───────────────────────────────────────────────
// Expected strokes from primary rough / intermediate rough.

export const ROUGH_BASELINE: BaselineEntry[] = [
  [5,   2.48],
  [10,  2.60],
  [15,  2.69],
  [20,  2.70],
  [25,  2.74],
  [30,  2.78],
  [40,  2.87],
  [50,  2.97],
  [60,  3.07],
  [75,  3.07],
  [100, 3.18],
  [125, 3.30],
  [150, 3.44],
  [175, 3.59],
  [200, 3.74],
  [225, 3.89],
  [250, 4.04],
  [275, 4.18],
  [300, 4.32],
  [350, 4.58],
];

// ─── Greenside fringe / chip from short rough (distance in yards) ─────────────
// Used for around-green shots when inside 30 yards and not in bunker.

export const FRINGE_BASELINE: BaselineEntry[] = [
  [1,   2.04],
  [2,   2.12],
  [3,   2.18],
  [5,   2.30],
  [7,   2.40],
  [10,  2.49],
  [12,  2.56],
  [15,  2.62],
  [18,  2.67],
  [20,  2.72],
  [25,  2.80],
  [30,  2.87],
];

// ─── Greenside bunker / sand (distance in yards) ──────────────────────────────
// Expected strokes from a greenside bunker shot.

export const SAND_BASELINE: BaselineEntry[] = [
  [2,   2.10],
  [5,   2.23],
  [7,   2.34],
  [10,  2.44],
  [15,  2.55],
  [20,  2.63],
  [25,  2.71],
  [30,  2.79],
  [40,  2.95],
  [50,  3.10],
  [75,  3.37],
  [100, 3.58],
];

// ─── Recovery (penalty/heavy rough/trees, distance in yards) ──────────────────
// Used when in an unplayable or very difficult lie.

export const RECOVERY_BASELINE: BaselineEntry[] = [
  [10,  2.80],
  [25,  3.20],
  [50,  3.50],
  [75,  3.65],
  [100, 3.80],
  [125, 3.90],
  [150, 4.00],
  [200, 4.20],
];

// ─── Tee (hole distance in yards → expected strokes from tee) ─────────────────
// Broadie Table 5.2: scratch golfer expected strokes from tee as a function
// of hole length. Accounts for driving, approach, and finishing.
// Used for Strokes Gained: Off the Tee calculations.

export const TEE_BASELINE: BaselineEntry[] = [
  [100, 2.48],
  [125, 2.65],
  [150, 2.76],
  [175, 2.90],
  [200, 3.00],
  [225, 3.14],
  [250, 3.25],
  [275, 3.37],
  [300, 3.50],
  [325, 3.63],
  [350, 3.76],
  [375, 3.87],
  [400, 3.97],
  [425, 4.09],
  [450, 4.22],
  [475, 4.33],
  [500, 4.44],
  [525, 4.55],
  [550, 4.65],
  [575, 4.74],
  [600, 4.83],
  [650, 5.01],
  [700, 5.18],
];

// ─── Par-based tee fallback ───────────────────────────────────────────────────
// Used when hole yardage is unknown; slightly less accurate than TEE_BASELINE.

export const PAR_TEE_BASELINE: Record<3 | 4 | 5, number> = {
  3: 3.05,
  4: 3.95,
  5: 4.75,
};
