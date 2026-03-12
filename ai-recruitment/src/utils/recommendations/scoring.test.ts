import { describe, expect, it } from "vitest";
import {
  calculateExperienceMatch,
  calculateLocationMatch,
  calculateMatchScore,
  calculateSalaryFit,
  calculateSkillMatch,
} from "@/utils/recommendations/scoring";

describe("recommendation scoring", () => {
  it("calculateSkillMatch returns expected percentage", () => {
    const score = calculateSkillMatch(["React", "Node.js", "Docker"], ["React", "Docker", "TypeScript"]);
    expect(score).toBe(67);
  });

  it("calculateExperienceMatch favors in-range experience", () => {
    const inRange = calculateExperienceMatch(2, 1, 3);
    const belowRange = calculateExperienceMatch(0.5, 1, 3);
    expect(inRange).toBe(100);
    expect(belowRange).toBeLessThan(inRange);
  });

  it("calculateLocationMatch favors remote and exact preferences", () => {
    const remote = calculateLocationMatch({ workMode: "REMOTE", candidateLocation: "Bangalore", jobLocation: "Delhi" });
    const exact = calculateLocationMatch({ candidateLocation: "Bangalore", jobLocation: "Bangalore" });
    expect(remote).toBe(100);
    expect(exact).toBeGreaterThanOrEqual(90);
  });

  it("calculateSalaryFit produces bounded score", () => {
    const score = calculateSalaryFit({ expectedMin: 20, expectedMax: 30, jobMin: 18, jobMax: 26 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("calculateMatchScore honors weighted core formula", () => {
    const score = calculateMatchScore({
      skillMatch: 80,
      experienceMatch: 60,
      locationMatch: 50,
      salaryFit: 90,
      behavioralScore: 70,
      semanticScore: 80,
      rolePreferenceBoost: 5,
      careerPathBoost: 5,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
