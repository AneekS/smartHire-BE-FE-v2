import { describe, expect, it } from "vitest";
import { cosineSimilarity, generateEmbedding } from "@/utils/recommendations/embedding";

describe("embedding utils", () => {
  it("generateEmbedding is deterministic", async () => {
    const one = await generateEmbedding("Senior React developer");
    const two = await generateEmbedding("Senior React developer");
    expect(one).toEqual(two);
  });

  it("cosineSimilarity returns 1 for identical vectors", () => {
    const score = cosineSimilarity([1, 2, 3], [1, 2, 3]);
    expect(score).toBe(1);
  });

  it("cosineSimilarity handles non-overlapping vectors", () => {
    const score = cosineSimilarity([1, 0], [0, 1]);
    expect(score).toBe(0);
  });
});
