import { describe, it, expect } from "vitest";
import {
  pearsonr,
  normalizeWeights,
  weightsToFractions,
  fractionsToWeights,
  twoProportionZTest,
  cosineSimilarity,
  shuffle,
} from "@/feedback/stats";
import { SCORE_COMPONENTS } from "@/feedback/types";

describe("feedback/stats", () => {
  it("pearsonr returns ~1 for perfectly correlated arrays", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [2, 4, 6, 8, 10];
    expect(pearsonr(xs, ys)).toBeCloseTo(1, 5);
  });

  it("pearsonr returns ~0 for uncorrelated constant y", () => {
    expect(pearsonr([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0);
  });

  it("normalizeWeights sums to 1", () => {
    const raw = Object.fromEntries(SCORE_COMPONENTS.map((k) => [k, 1])) as Record<
      (typeof SCORE_COMPONENTS)[number],
      number
    >;
    const n = normalizeWeights(raw);
    const sum = SCORE_COMPONENTS.reduce((acc, k) => acc + n[k], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("weightsToFractions and fractionsToWeights round-trip approximately", () => {
    const weights = {
      semanticMatch: 25,
      skillMatch: 30,
      experienceMatch: 20,
      seniorityBand: 10,
      educationMatch: 5,
      achievementScore: 10,
    };
    const fractions = weightsToFractions(weights);
    const back = fractionsToWeights(fractions);
    const sum = Object.values(back).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("twoProportionZTest detects significant difference", () => {
    const { pValue } = twoProportionZTest(160, 200, 80, 200);
    expect(pValue).toBeLessThan(0.05);
  });

  it("cosineSimilarity is 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("shuffle preserves elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});
