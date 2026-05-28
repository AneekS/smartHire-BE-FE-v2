import { describe, it, expect } from "vitest";
import { l2Normalize } from "@/embedding/embedder";

describe("l2Normalize", () => {
  it("normalizes vector to unit length", () => {
    const v = l2Normalize([3, 4]);
    const norm = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    expect(norm).toBeCloseTo(1, 5);
    expect(v[0]).toBeCloseTo(0.6, 5);
    expect(v[1]).toBeCloseTo(0.8, 5);
  });

  it("returns zero vector unchanged when norm is zero", () => {
    expect(l2Normalize([0, 0])).toEqual([0, 0]);
  });
});
