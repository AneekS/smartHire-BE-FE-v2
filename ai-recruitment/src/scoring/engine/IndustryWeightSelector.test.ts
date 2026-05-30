import { describe, it, expect } from "vitest";
import { selectIndustryWeights } from "@/scoring/engine/IndustryWeightSelector";
import { INDUSTRY_WEIGHTS } from "@/scoring/constants";
import type { WeightCalibration } from "@prisma/client";

const calibratedRow = {
  semanticWeight: 0.4,
  skillWeight: 0.3,
  experienceWeight: 0.1,
  complianceWeight: 0.05,
  projectWeight: 0.05,
  educationWeight: 0.05,
  qualityWeight: 0.05,
  sampleSize: 60,
  isActive: true,
} as WeightCalibration;

describe("IndustryWeightSelector", () => {
  it("prefers recruiter override over calibrated weights", () => {
    const result = selectIndustryWeights({
      jobIndustry: "TECH",
      recruiterOverride: { ...INDUSTRY_WEIGHTS.TECH, semanticMatch: 0.5 },
      calibration: calibratedRow,
    });
    expect(result.source).toBe("recruiter_override");
    expect(result.weights.semanticMatch).toBeGreaterThan(0.4);
  });

  it("uses calibrated weights when sampleSize > 50", () => {
    const result = selectIndustryWeights({
      jobIndustry: "TECH",
      calibration: calibratedRow,
    });
    expect(result.source).toBe("calibrated");
    expect(result.weights.semanticMatch).toBeCloseTo(0.4, 2);
  });

  it("falls back to industry defaults", () => {
    const result = selectIndustryWeights({
      jobIndustry: "FINANCE",
      calibration: { ...calibratedRow, sampleSize: 10, isActive: true },
    });
    expect(result.source).toBe("industry");
    expect(result.weights).toEqual(INDUSTRY_WEIGHTS.FINANCE);
  });

  it("falls back to GENERAL", () => {
    const result = selectIndustryWeights({
      jobIndustry: "UNKNOWN",
      calibration: null,
    });
    expect(result.source).toBe("general");
    expect(result.weights).toEqual(INDUSTRY_WEIGHTS.GENERAL);
  });
});
