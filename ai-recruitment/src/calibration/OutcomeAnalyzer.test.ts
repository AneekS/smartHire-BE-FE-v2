import { describe, it, expect } from "vitest";
import { OutcomeAnalyzer } from "@/calibration/OutcomeAnalyzer";
import type { RecruiterDecision } from "@prisma/client";

function decision(
  type: "HIRED" | "REJECTED",
  overall: number,
  componentScores: Record<string, number>
): RecruiterDecision {
  const breakdown: Record<string, { score: number }> = {
    overallScore: { score: overall },
  };
  for (const [k, v] of Object.entries(componentScores)) {
    breakdown[k] = { score: v };
  }
  return {
    decision: type,
    scoreBreakdown: breakdown,
    atsScoreAtDecision: overall,
  } as unknown as RecruiterDecision;
}

describe("OutcomeAnalyzer", () => {
  it("returns INSUFFICIENT_DATA below thresholds", () => {
    const result = OutcomeAnalyzer.analyzeOutcomes([
      ...Array.from({ length: 5 }, () => decision("HIRED", 80, {})),
      ...Array.from({ length: 5 }, () => decision("REJECTED", 40, {})),
    ]);
    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.hired).toBe(5);
    expect(result.rejected).toBe(5);
  });

  it("returns NOT_MEANINGFUL when discrimination is low", () => {
    const hired = Array.from({ length: 25 }, () =>
      decision("HIRED", 72, { semanticMatch: 70 })
    );
    const rejected = Array.from({ length: 25 }, () =>
      decision("REJECTED", 70, { semanticMatch: 68 })
    );
    const result = OutcomeAnalyzer.analyzeOutcomes([...hired, ...rejected]);
    expect(result.status).toBe("NOT_MEANINGFUL");
  });

  it("returns SUCCESS with normalized derived weights", () => {
    const hired = Array.from({ length: 25 }, () =>
      decision("HIRED", 85, {
        semanticMatch: 90,
        skillMatch: 88,
        experienceMatch: 80,
        atsCompliance: 75,
        projectRelevance: 82,
        educationMatch: 70,
        resumeQuality: 78,
      })
    );
    const rejected = Array.from({ length: 25 }, () =>
      decision("REJECTED", 45, {
        semanticMatch: 40,
        skillMatch: 42,
        experienceMatch: 38,
        atsCompliance: 50,
        projectRelevance: 35,
        educationMatch: 55,
        resumeQuality: 48,
      })
    );
    const result = OutcomeAnalyzer.analyzeOutcomes([...hired, ...rejected]);
    expect(result.status).toBe("SUCCESS");
    expect(result.derivedWeights).toBeDefined();
    const sum = Object.values(result.derivedWeights!).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(result.discriminationPower).toBeGreaterThan(0.1);
  });
});
