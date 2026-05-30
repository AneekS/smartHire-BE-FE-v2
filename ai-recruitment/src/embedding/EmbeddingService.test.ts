import { describe, it, expect } from "vitest";
import { EmbeddingService, l2Normalize } from "@/embedding/EmbeddingService";

describe("EmbeddingService.weightedAverage", () => {
  it("computes weighted average then L2-normalizes", () => {
    const v1 = l2Normalize([1, 0]);
    const v2 = l2Normalize([0, 1]);
    const result = EmbeddingService.weightedAverage([
      { vector: v1, weight: 1.5 },
      { vector: v2, weight: 1.0 },
    ]);

    expect(result).toHaveLength(2);
    const norm = Math.sqrt(result[0] ** 2 + result[1] ** 2);
    expect(norm).toBeCloseTo(1, 5);
    expect(result[0]).toBeGreaterThan(result[1]);
  });

  it("returns empty array for no items", () => {
    expect(EmbeddingService.weightedAverage([])).toEqual([]);
  });

  it("is deterministic for identical inputs", () => {
    const items = [
      { vector: l2Normalize([3, 4, 0]), weight: 1.2 },
      { vector: l2Normalize([1, 2, 3]), weight: 0.8 },
    ];
    const a = EmbeddingService.weightedAverage(items);
    const b = EmbeddingService.weightedAverage(items);
    expect(a).toEqual(b);
  });
});
