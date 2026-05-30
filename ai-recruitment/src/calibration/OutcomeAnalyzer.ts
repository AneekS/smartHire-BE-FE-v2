import type { RecruiterDecision } from "@prisma/client";
import { SCORE_COMPONENTS } from "@/feedback/types";
import type { OutcomeAnalysisResult } from "@/calibration/types/calibration.types";
import {
  COMPONENT_TO_WEIGHT,
  extractComponentScore,
  extractFinalScore,
  MIN_DISCRIMINATION,
  MIN_HIRED,
  MIN_REJECTED,
  toWeightProfile,
} from "@/calibration/calibration.utils";

export class OutcomeAnalyzer {
  static analyzeOutcomes(decisions: RecruiterDecision[]): OutcomeAnalysisResult {
    const hired = decisions.filter((d) => d.decision === "HIRED");
    const rejected = decisions.filter((d) => d.decision === "REJECTED");

    if (hired.length < MIN_HIRED || rejected.length < MIN_REJECTED) {
      return {
        status: "INSUFFICIENT_DATA",
        hired: hired.length,
        rejected: rejected.length,
        sampleSize: hired.length + rejected.length,
      };
    }

    const rawImportance: Record<string, number> = {};
    for (const component of SCORE_COMPONENTS) {
      const hiredScores = hired
        .map((d) => extractComponentScore(d.scoreBreakdown, component))
        .filter((v): v is number => v != null);
      const rejectedScores = rejected
        .map((d) => extractComponentScore(d.scoreBreakdown, component))
        .filter((v): v is number => v != null);

      const hiredAvg =
        hiredScores.length > 0
          ? hiredScores.reduce((a, b) => a + b, 0) / hiredScores.length
          : 0;
      const rejectedAvg =
        rejectedScores.length > 0
          ? rejectedScores.reduce((a, b) => a + b, 0) / rejectedScores.length
          : 0;

      rawImportance[component] = Math.max(0, hiredAvg - rejectedAvg);
    }

    const rawSum = Object.values(rawImportance).reduce((a, b) => a + b, 0) || 1;
    const derivedRecord = {
      semanticWeight: 0,
      skillWeight: 0,
      experienceWeight: 0,
      complianceWeight: 0,
      projectWeight: 0,
      educationWeight: 0,
      qualityWeight: 0,
    };

    for (const component of SCORE_COMPONENTS) {
      const key = COMPONENT_TO_WEIGHT[component];
      derivedRecord[key] = rawImportance[component]! / rawSum;
    }

    const hiredFinals = hired
      .map((d) => extractFinalScore(d.scoreBreakdown, d.atsScoreAtDecision))
      .filter((v): v is number => v != null);
    const rejectedFinals = rejected
      .map((d) => extractFinalScore(d.scoreBreakdown, d.atsScoreAtDecision))
      .filter((v): v is number => v != null);

    const meanHired =
      hiredFinals.reduce((a, b) => a + b, 0) / (hiredFinals.length || 1);
    const meanRejected =
      rejectedFinals.reduce((a, b) => a + b, 0) / (rejectedFinals.length || 1);
    const discriminationPower = (meanHired - meanRejected) / 100;

    if (discriminationPower < MIN_DISCRIMINATION) {
      return {
        status: "NOT_MEANINGFUL",
        discriminationPower,
        sampleSize: hired.length + rejected.length,
        hired: hired.length,
        rejected: rejected.length,
      };
    }

    return {
      status: "SUCCESS",
      derivedWeights: toWeightProfile(derivedRecord),
      discriminationPower,
      sampleSize: hired.length + rejected.length,
      hired: hired.length,
      rejected: rejected.length,
    };
  }
}
