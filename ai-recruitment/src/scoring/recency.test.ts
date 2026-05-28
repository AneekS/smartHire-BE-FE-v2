import { describe, expect, it } from "vitest";
import { applyRecencyDecay } from "@/scoring/recency";

describe("applyRecencyDecay", () => {
  const year = 2026;

  it("returns 1.0 for skills used within 1 year", () => {
    expect(applyRecencyDecay(year, year)).toBe(1);
    expect(applyRecencyDecay(year - 1, year)).toBe(1);
  });

  it("returns 0.95 for 2 years ago", () => {
    expect(applyRecencyDecay(year - 2, year)).toBe(0.95);
  });

  it("returns 0.88 for 3 years ago", () => {
    expect(applyRecencyDecay(year - 3, year)).toBe(0.88);
  });

  it("returns 0.75 for 5 years ago", () => {
    expect(applyRecencyDecay(year - 5, year)).toBe(0.75);
  });

  it("returns 0.60 for 7 years ago", () => {
    expect(applyRecencyDecay(year - 7, year)).toBe(0.6);
  });

  it("returns 0.45 for 8+ years ago", () => {
    expect(applyRecencyDecay(year - 8, year)).toBe(0.45);
    expect(applyRecencyDecay(2010, year)).toBe(0.45);
  });

  it("returns 0.75 when lastUsedYear unknown", () => {
    expect(applyRecencyDecay(null, year)).toBe(0.75);
    expect(applyRecencyDecay(undefined, year)).toBe(0.75);
  });
});
