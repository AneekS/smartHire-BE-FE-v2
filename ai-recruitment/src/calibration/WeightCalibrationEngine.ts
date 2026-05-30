import { prisma } from "@/lib/prisma";
import type { IndustryProfile } from "@prisma/client";
import { OutcomeAnalyzer } from "@/calibration/OutcomeAnalyzer";
import type { CalibrationResult } from "@/calibration/types/calibration.types";
import {
  DEFAULT_BLEND,
  DERIVED_BLEND,
  fromWeightProfile,
  industryDefaults,
  MIN_TOTAL_DECISIONS,
  normalizeWeightRecord,
  toWeightProfile,
  weightRowToProfile,
} from "@/calibration/calibration.utils";
import { NotificationService } from "@/services/NotificationService";
import { trackEvent } from "@/monitoring/appInsights";
import { getLogger } from "@/monitoring/logger";

const LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;
const MIN_FACTOR = 0.9;
const MAX_FACTOR = 1.1;
const MIN_CALIBRATION_SAMPLES = 50;

export class WeightCalibrationEngine {
  static async run(
    tenantId: string,
    industryProfile: IndustryProfile
  ): Promise<CalibrationResult> {
    const since = new Date(Date.now() - LOOKBACK_MS);

    const decisions = await prisma.recruiterDecision.findMany({
      where: {
        tenantId,
        decidedAt: { gte: since },
        OR: [{ decision: "HIRED" }, { decision: "REJECTED" }],
      },
      orderBy: { decidedAt: "desc" },
      take: 2000,
    });

    if (decisions.length < MIN_TOTAL_DECISIONS) {
      const hired = decisions.filter((d) => d.decision === "HIRED").length;
      const rejected = decisions.filter((d) => d.decision === "REJECTED").length;
      return {
        status: "INSUFFICIENT_DATA",
        sampleSize: decisions.length,
        hired,
        rejected,
      };
    }

    const analysis = OutcomeAnalyzer.analyzeOutcomes(decisions);
    if (analysis.status !== "SUCCESS" || !analysis.derivedWeights) {
      return {
        status: analysis.status,
        discriminationPower: analysis.discriminationPower,
        sampleSize: analysis.sampleSize,
        hired: analysis.hired,
        rejected: analysis.rejected,
      };
    }

    const derived = fromWeightProfile(analysis.derivedWeights);
    const defaults = industryDefaults(industryProfile);
    const blended = normalizeWeightRecord({
      semanticWeight:
        derived.semanticWeight * DERIVED_BLEND +
        defaults.semanticWeight * DEFAULT_BLEND,
      skillWeight:
        derived.skillWeight * DERIVED_BLEND + defaults.skillWeight * DEFAULT_BLEND,
      experienceWeight:
        derived.experienceWeight * DERIVED_BLEND +
        defaults.experienceWeight * DEFAULT_BLEND,
      complianceWeight:
        derived.complianceWeight * DERIVED_BLEND +
        defaults.complianceWeight * DEFAULT_BLEND,
      projectWeight:
        derived.projectWeight * DERIVED_BLEND +
        defaults.projectWeight * DEFAULT_BLEND,
      educationWeight:
        derived.educationWeight * DERIVED_BLEND +
        defaults.educationWeight * DEFAULT_BLEND,
      qualityWeight:
        derived.qualityWeight * DERIVED_BLEND +
        defaults.qualityWeight * DEFAULT_BLEND,
    });

    const sampleSize = analysis.sampleSize ?? decisions.length;
    const discriminationPower = analysis.discriminationPower!;

    const previousActive = await prisma.weightCalibration.findFirst({
      where: { tenantId, industryProfile, isActive: true },
      orderBy: { calibratedAt: "desc" },
    });
    const previousWeights = previousActive
      ? weightRowToProfile(previousActive)
      : null;

    const calibration = await prisma.$transaction(async (tx) => {
      await tx.weightCalibration.updateMany({
        where: { tenantId, industryProfile, isActive: true },
        data: { isActive: false },
      });

      const row = await tx.weightCalibration.create({
        data: {
          tenantId,
          industryProfile,
          ...blended,
          sampleSize,
          discriminationPower,
          isActive: true,
          calibrationVersion: (previousActive?.calibrationVersion ?? 0) + 1,
        },
      });

      await tx.weightRecalibrationRun.create({
        data: {
          tenantId,
          roleType: industryProfile,
          componentDeltas: derived,
          correlations: {
            discriminationPower,
            hired: analysis.hired,
            rejected: analysis.rejected,
          },
        },
      });

      return row;
    });

    trackEvent("calibration_completed", {
      tenantId,
      industryProfile,
      calibrationId: calibration.id,
    });

    await NotificationService.notifyCalibrationComplete({
      tenantId,
      calibrationId: calibration.id,
      industryProfile,
    });

    return {
      status: "SUCCESS",
      calibrationId: calibration.id,
      calibrationVersion: calibration.calibrationVersion,
      newWeights: toWeightProfile(blended),
      previousWeights,
      sampleSize,
      discriminationPower,
    };
  }

  /** @deprecated Use run() — kept for outcome API threshold trigger */
  static async syncFromOutcomeSignals(
    tenantId: string,
    industryProfile: IndustryProfile
  ): Promise<CalibrationResult> {
    const result = await WeightCalibrationEngine.run(tenantId, industryProfile);
    if (result.status !== "SUCCESS") {
      getLogger().info(
        { tenantId, industryProfile, status: result.status },
        "Calibration skipped after outcome signal"
      );
    }
    return result;
  }

  /**
   * @deprecated Scoring reads WeightCalibration via adjustWeightsWithFeedback.
   * Legacy multiplier for FinalATS when no active calibration row exists.
   */
  static async getCalibrationFactor(
    tenantId: string | undefined,
    industry: IndustryProfile
  ): Promise<number> {
    const resolvedTenant = tenantId?.trim();
    if (!resolvedTenant) return 1;

    try {
      const active = await prisma.weightCalibration.findFirst({
        where: {
          tenantId: resolvedTenant,
          industryProfile: industry,
          isActive: true,
          sampleSize: { gt: MIN_CALIBRATION_SAMPLES },
        },
        orderBy: { calibratedAt: "desc" },
      });

      if (active) {
        return Math.min(1, 0.85 + 0.15 * (active.sampleSize / 1000));
      }

      const decisions = await prisma.recruiterDecision.findMany({
        where: {
          tenantId: resolvedTenant,
          decidedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        take: 200,
        orderBy: { decidedAt: "desc" },
      });

      if (decisions.length < 10) return 1;

      let positive = 0;
      let negative = 0;
      for (const d of decisions) {
        if (d.decision === "HIRED" || d.decision === "SHORTLISTED") positive++;
        if (d.decision === "REJECTED") negative++;
      }

      const total = positive + negative;
      if (total === 0) return 1;

      const hireRate = positive / total;
      const target = 0.35;
      const delta = hireRate - target;
      const factor = 1 - delta * 0.15;
      return Math.max(MIN_FACTOR, Math.min(MAX_FACTOR, factor));
    } catch {
      return 1;
    }
  }
}
