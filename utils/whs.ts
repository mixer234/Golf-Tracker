// WHS Score Differential = (113 / Slope Rating) × (Adjusted Gross Score − Course Rating)
export function calcScoreDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  const diff = (113 / slopeRating) * (adjustedGrossScore - courseRating);
  return Math.round(diff * 10) / 10;
}

// WHS table: number of differentials to use based on rounds available
const DIFF_COUNT_TABLE: [number, number][] = [
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 2],
  [7, 2],
  [8, 2],
  [9, 3],
  [10, 3],
  [11, 4],
  [12, 4],
  [13, 5],
  [14, 5],
  [15, 6],
  [16, 6],
  [17, 7],
  [18, 7],
  [19, 8],
  [20, 8],
];

export function calcHandicapIndex(differentials: number[]): number | null {
  const available = differentials.slice(0, 20);
  if (available.length < 3) return null;

  const count = DIFF_COUNT_TABLE.find(([rounds]) => rounds === available.length)?.[1]
    ?? (available.length >= 20 ? 8 : null);
  if (count === null) return null;

  const sorted = [...available].sort((a, b) => a - b);
  const lowest = sorted.slice(0, count);
  const avg = lowest.reduce((a, b) => a + b, 0) / lowest.length;
  return Math.round(avg * 10) / 10;
}

// Adjustments per WHS: +/- stroke adjustments based on exceptional rounds
export function applyHandicapAdjustment(index: number, recentDifferentials: number[]): number {
  if (recentDifferentials.length < 8) return index;
  const exceptional = recentDifferentials.filter((d) => d <= index - 7);
  if (exceptional.length >= 2) return Math.max(index - 1, index * 0.9);
  return index;
}
