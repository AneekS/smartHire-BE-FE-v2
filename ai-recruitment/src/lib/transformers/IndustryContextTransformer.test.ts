import { describe, it, expect } from "vitest";
import {
  IndustryContextTransformer,
  interpolateUserPercentile,
  benchmarkLabelFromPercentile,
} from "@/lib/transformers/IndustryContextTransformer";
import type { IndustryStatsResult } from "@/services/IndustryStatsService";

const baseStats: IndustryStatsResult = {
  industry: "TECH",
  seniorityBand: "L3_MID",
  p25: 55,
  p50: 68,
  p75: 78,
  p90: 88,
  count: 120,
};

describe("IndustryContextTransformer", () => {
  describe("interpolateUserPercentile", () => {
    it("interpolates between percentile bands", () => {
      expect(interpolateUserPercentile(55, baseStats)).toBeCloseTo(25, 0);
      expect(interpolateUserPercentile(68, baseStats)).toBeCloseTo(50, 0);
      expect(interpolateUserPercentile(78, baseStats)).toBeCloseTo(75, 0);
      expect(interpolateUserPercentile(88, baseStats)).toBeCloseTo(90, 0);
    });

    it("labels benchmarks from percentile", () => {
      expect(benchmarkLabelFromPercentile(92)).toBe("Top 10%");
      expect(benchmarkLabelFromPercentile(80)).toBe("Above average");
      expect(benchmarkLabelFromPercentile(60)).toBe("Above median");
      expect(benchmarkLabelFromPercentile(40)).toBe("Below median");
      expect(benchmarkLabelFromPercentile(10)).toBe("Below average");
    });
  });

  describe("toIndustryStatsCard", () => {
    it("builds card with user percentile and benchmark label", () => {
      const card = IndustryContextTransformer.toIndustryStatsCard(baseStats, 82);
      expect(card.industryProfile).toBe("TECH");
      expect(card.seniorityBand).toBe("L3_MID");
      expect(card.sampleSize).toBe(120);
      expect(card.userScore).toBe(82);
      expect(card.userPercentile).toBeGreaterThan(75);
      expect(card.benchmarkLabel).toBe("Above average");
    });

    it("handles missing user score", () => {
      const card = IndustryContextTransformer.toIndustryStatsCard(baseStats);
      expect(card.userScore).toBeNull();
      expect(card.userPercentile).toBeNull();
      expect(card.benchmarkLabel).toBe("No score provided");
    });
  });

  describe("toWeightProfileDisplay", () => {
    it("uses calibrated weights when sample size >= 40", () => {
      const display = IndustryContextTransformer.toWeightProfileDisplay(
        {
          industryProfile: "TECH",
          semanticWeight: 0.4,
          skillWeight: 0.25,
          experienceWeight: 0.1,
          complianceWeight: 0.05,
          projectWeight: 0.1,
          educationWeight: 0.05,
          qualityWeight: 0.05,
          sampleSize: 45,
          calibratedAt: "2026-05-01T00:00:00.000Z",
          isActive: true,
        },
        "TECH"
      );

      expect(display.source).toBe("calibrated");
      expect(display.weights.semantic).toBe(0.4);
      expect(display.calibrationSampleSize).toBe(45);
    });

    it("falls back to industry defaults when calibration insufficient", () => {
      const display = IndustryContextTransformer.toWeightProfileDisplay(null, "FINANCE");
      expect(display.source).toBe("industry_default");
      expect(display.industryProfile).toBe("FINANCE");
      expect(display.weights.semantic).toBeGreaterThan(0);
    });

    it("uses general_default for GENERAL industry", () => {
      const display = IndustryContextTransformer.toWeightProfileDisplay(null, "GENERAL");
      expect(display.source).toBe("general_default");
    });
  });

  describe("toCalibrationStatus", () => {
    it("marks calibrated when sample threshold met", () => {
      const status = IndustryContextTransformer.toCalibrationStatus(
        "tenant-1",
        "TECH",
        {
          industryProfile: "TECH",
          semanticWeight: 0.3,
          skillWeight: 0.3,
          experienceWeight: 0.1,
          complianceWeight: 0.1,
          projectWeight: 0.1,
          educationWeight: 0.05,
          qualityWeight: 0.05,
          sampleSize: 42,
          calibratedAt: "2026-05-01T00:00:00.000Z",
        },
        42
      );

      expect(status.isCalibrated).toBe(true);
      expect(status.requiredForCalibration).toBe(40);
      expect(status.currentSampleSize).toBe(42);
      expect(status.lastCalibratedAt).toBe("2026-05-01T00:00:00.000Z");
      expect(status.discriminationPower).toBeNull();
      expect(status.calibrationVersion).toBeNull();
    });

    it("marks not calibrated below threshold", () => {
      const status = IndustryContextTransformer.toCalibrationStatus(
        "tenant-1",
        "TECH",
        null,
        15
      );
      expect(status.isCalibrated).toBe(false);
      expect(status.currentSampleSize).toBe(15);
    });
  });
});
