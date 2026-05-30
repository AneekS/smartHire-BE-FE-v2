import type { IndustryProfile } from "@prisma/client";
import { getIndustryWeights, resolveIndustry } from "@/scoring/constants";
import type { IndustryStatsResult } from "@/services/IndustryStatsService";
import type {
  IndustryPercentiles,
  IndustryStatsCard,
  WeightProfileDisplay,
  WeightProfileSource,
  WeightProfileWeights,
} from "@/types/industry.types";
import type { CalibrationStatus } from "@/calibration/types/calibration.types";

const CALIBRATION_REQUIRED = 40 as const;

export interface WeightCalibrationRow {
  industryProfile: IndustryProfile | string;
  semanticWeight: number;
  skillWeight: number;
  experienceWeight: number;
  complianceWeight: number;
  projectWeight: number;
  educationWeight: number;
  qualityWeight: number;
  sampleSize: number;
  calibratedAt: Date | string;
  isActive?: boolean;
  discriminationPower?: number | null;
  calibrationVersion?: number | null;
}

function toIndustryProfile(value: string | null | undefined): IndustryProfile {
  const normalized = resolveIndustry(value ?? undefined);
  return normalized as IndustryProfile;
}

function percentilesFromStats(stats: IndustryStatsResult): IndustryPercentiles {
  return {
    p25: stats.p25,
    p50: stats.p50,
    p75: stats.p75,
    p90: stats.p90,
  };
}

export function interpolateUserPercentile(
  score: number,
  percentiles: IndustryPercentiles
): number {
  const { p25, p50, p75, p90 } = percentiles;
  if (score <= p25) {
    return p25 > 0 ? Math.max(0, (score / p25) * 25) : 0;
  }
  if (score <= p50) {
    const span = p50 - p25 || 1;
    return 25 + ((score - p25) / span) * 25;
  }
  if (score <= p75) {
    const span = p75 - p50 || 1;
    return 50 + ((score - p50) / span) * 25;
  }
  if (score <= p90) {
    const span = p90 - p75 || 1;
    return 75 + ((score - p75) / span) * 15;
  }
  const aboveSpan = Math.max(p90 * 0.1, 1);
  return Math.min(99, 90 + ((score - p90) / aboveSpan) * 9);
}

export function benchmarkLabelFromPercentile(percentile: number): string {
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Above average";
  if (percentile >= 50) return "Above median";
  if (percentile >= 25) return "Below median";
  return "Below average";
}

function rowToDisplayWeights(row: WeightCalibrationRow): WeightProfileWeights {
  return {
    semantic: row.semanticWeight,
    skill: row.skillWeight,
    experience: row.experienceWeight,
    compliance: row.complianceWeight,
    project: row.projectWeight,
    education: row.educationWeight,
    quality: row.qualityWeight,
  };
}

function industryDefaultsToDisplayWeights(
  industry: IndustryProfile
): WeightProfileWeights {
  const w = getIndustryWeights(resolveIndustry(industry));
  return {
    semantic: w.semanticMatch,
    skill: w.skillMatch,
    experience: w.experienceMatch,
    compliance: w.atsCompliance,
    project: w.projectRelevance,
    education: w.educationMatch,
    quality: w.resumeQuality,
  };
}

function resolveWeightSource(
  calibration: WeightCalibrationRow | null | undefined,
  industry: IndustryProfile
): { source: WeightProfileSource; message: string } {
  if (
    calibration &&
    calibration.isActive !== false &&
    calibration.sampleSize >= CALIBRATION_REQUIRED
  ) {
    return {
      source: "calibrated",
      message: `Weights calibrated from ${calibration.sampleSize} recruiter decisions.`,
    };
  }
  if (industry !== "GENERAL") {
    return {
      source: "industry_default",
      message: `Using default ${industry} industry weights.`,
    };
  }
  return {
    source: "general_default",
    message: "Using general default scoring weights.",
  };
}

export class IndustryContextTransformer {
  static toIndustryStatsCard(
    stats: IndustryStatsResult,
    userScore?: number | null
  ): IndustryStatsCard {
    const percentiles = percentilesFromStats(stats);
    const industryProfile = toIndustryProfile(stats.industry);
    const seniorityBand =
      stats.seniorityBand && stats.seniorityBand.length > 0
        ? (stats.seniorityBand as IndustryStatsCard["seniorityBand"])
        : null;

    const userPercentile =
      typeof userScore === "number"
        ? interpolateUserPercentile(userScore, percentiles)
        : null;

    return {
      industryProfile,
      seniorityBand,
      percentiles,
      sampleSize: stats.count,
      userScore: typeof userScore === "number" ? userScore : null,
      userPercentile,
      benchmarkLabel:
        userPercentile !== null
          ? benchmarkLabelFromPercentile(userPercentile)
          : "No score provided",
    };
  }

  static toWeightProfileDisplay(
    calibration: WeightCalibrationRow | null | undefined,
    industry: IndustryProfile | string = "GENERAL"
  ): WeightProfileDisplay {
    const industryProfile = toIndustryProfile(
      typeof industry === "string" ? industry : industry
    );
    const { source, message } = resolveWeightSource(calibration, industryProfile);

    const weights =
      source === "calibrated" && calibration
        ? rowToDisplayWeights(calibration)
        : industryDefaultsToDisplayWeights(industryProfile);

    return {
      source,
      industryProfile,
      weights,
      calibrationSampleSize: calibration?.sampleSize,
      lastCalibratedAt: calibration
        ? calibration.calibratedAt instanceof Date
          ? calibration.calibratedAt.toISOString()
          : String(calibration.calibratedAt)
        : null,
      message,
    };
  }

  static toCalibrationStatus(
    tenantId: string,
    industry: IndustryProfile | string,
    calibration: WeightCalibrationRow | null | undefined,
    sampleSize: number
  ): CalibrationStatus {
    const industryProfile = toIndustryProfile(
      typeof industry === "string" ? industry : industry
    );
    const isCalibrated = Boolean(
      calibration &&
        calibration.isActive !== false &&
        calibration.sampleSize >= CALIBRATION_REQUIRED
    );

    const lastCalibratedAt = calibration
      ? calibration.calibratedAt instanceof Date
        ? calibration.calibratedAt.toISOString()
        : String(calibration.calibratedAt)
      : null;

    return {
      tenantId,
      industryProfile,
      currentSampleSize: sampleSize,
      requiredForCalibration: CALIBRATION_REQUIRED,
      isCalibrated,
      lastCalibratedAt,
      nextCalibrationAt: null,
      discriminationPower: calibration?.discriminationPower ?? null,
      calibrationVersion: calibration?.calibrationVersion ?? null,
    };
  }
}
