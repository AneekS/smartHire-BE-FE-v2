import { describe, expect, it } from "vitest";
import { getWeightProfile, WEIGHT_PROFILES, weightedOverall } from "@/scoring/weights";
import { parseJobSchema } from "@/models/job.schema";

describe("getWeightProfile", () => {
  it("returns IC profile by default", () => {
    const jd = parseJobSchema({ title: "Engineer" });
    expect(getWeightProfile(jd)).toEqual(WEIGHT_PROFILES.IC);
  });

  it("returns MANAGER profile for manager roles", () => {
    const jd = parseJobSchema({ title: "Eng Manager", roleType: "MANAGER" });
    expect(getWeightProfile(jd).skillMatch).toBe(20);
    expect(getWeightProfile(jd).experienceMatch).toBe(25);
  });

  it("returns SALES profile", () => {
    const jd = parseJobSchema({ title: "AE", roleType: "SALES" });
    expect(getWeightProfile(jd).achievementScore).toBe(15);
  });
});

describe("weightedOverall", () => {
  it("computes weighted average across components", () => {
    const weights = WEIGHT_PROFILES.IC;
    const score = weightedOverall(
      {
        semanticMatch: 80,
        skillMatch: 90,
        experienceMatch: 70,
        seniorityBand: 100,
        educationMatch: 100,
        achievementScore: 60,
      },
      weights
    );
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });
});
