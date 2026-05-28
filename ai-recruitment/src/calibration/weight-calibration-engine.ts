import { prisma } from "@/lib/prisma";
import type { IndustryDomain } from "@/scoring/v3/types";

const MIN_FACTOR = 0.9;
const MAX_FACTOR = 1.1;

/**
 * Per-tenant/industry calibration from recruiter hire/reject signals.
 * Returns multiplier applied to FinalATS (default 1.0).
 */
export class WeightCalibrationEngine {
  static async getCalibrationFactor(
    tenantId: string | undefined,
    industry: IndustryDomain
  ): Promise<number> {
    const resolvedTenant = tenantId?.trim();
    if (!resolvedTenant) return 1;

    try {
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
