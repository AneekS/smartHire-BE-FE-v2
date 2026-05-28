import type { FractionWeightProfile, ScoreComponent } from "@/feedback/types";
import { SCORE_COMPONENTS } from "@/feedback/types";

/** Pearson correlation coefficient between two numeric arrays. */
export function pearsonr(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const x = xs.slice(0, n);
  const y = ys.slice(0, n);

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

/** Normalize weight fractions to sum to 1.0. */
export function normalizeWeights(weights: FractionWeightProfile): FractionWeightProfile {
  const sum = SCORE_COMPONENTS.reduce((acc, k) => acc + (weights[k] ?? 0), 0);
  if (sum === 0) {
    const equal = 1 / SCORE_COMPONENTS.length;
    return Object.fromEntries(SCORE_COMPONENTS.map((k) => [k, equal])) as FractionWeightProfile;
  }
  return Object.fromEntries(
    SCORE_COMPONENTS.map((k) => [k, (weights[k] ?? 0) / sum])
  ) as FractionWeightProfile;
}

/** Convert 0–100 weight profile to fractions summing to 1. */
export function weightsToFractions(
  weights: Record<ScoreComponent, number>
): FractionWeightProfile {
  const sum = SCORE_COMPONENTS.reduce((acc, k) => acc + (weights[k] ?? 0), 0);
  if (sum === 0) {
    const equal = 1 / SCORE_COMPONENTS.length;
    return Object.fromEntries(SCORE_COMPONENTS.map((k) => [k, equal])) as FractionWeightProfile;
  }
  return Object.fromEntries(
    SCORE_COMPONENTS.map((k) => [k, (weights[k] ?? 0) / sum])
  ) as FractionWeightProfile;
}

/** Convert fraction weights to 0–100 scale (sums to 100). */
export function fractionsToWeights(
  fractions: FractionWeightProfile
): Record<ScoreComponent, number> {
  return Object.fromEntries(
    SCORE_COMPONENTS.map((k) => [k, Math.round((fractions[k] ?? 0) * 100)])
  ) as Record<ScoreComponent, number>;
}

/** Two-proportion z-test; returns two-tailed p-value. */
export function twoProportionZTest(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number
): { z: number; pValue: number } {
  if (nA === 0 || nB === 0) return { z: 0, pValue: 1 };

  const p1 = successesA / nA;
  const p2 = successesB / nB;
  const pPool = (successesA + successesB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));

  if (se === 0) return { z: 0, pValue: 1 };

  const z = (p1 - p2) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, pValue };
}

/** Standard normal CDF approximation (Abramowitz & Stegun). */
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 1 - p;
}

/** Cosine similarity between two vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

/** Fisher-Yates shuffle (in-place on copy). */
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
