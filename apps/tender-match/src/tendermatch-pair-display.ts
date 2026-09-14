/** Formatting only: source values and score policy are never rewritten. */
export function criterionPointsForDisplay(weightedPoints: number | null | undefined, engineVersion: string): number | null {
  if (weightedPoints === null || weightedPoints === undefined) return null;
  // Formula v1.1 stores weight × Fit (0–5), but the Points column is out of 100.
  return engineVersion === "tendermatch-match-formula/1.1.0" ? weightedPoints / 5 : weightedPoints;
}

/** Reciprocal-rank fusion is ranking evidence, never a probability or Pair Score. */
export function retrievalScoreLabel(value: number | null) {
  return value === null ? "Not ranked" : value.toFixed(4);
}
