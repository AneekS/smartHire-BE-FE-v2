import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  GLOBAL_TENANT_ID,
  SCORE_COMPONENTS,
  INDUSTRY_DOMAINS,
  type FractionWeightProfile,
  type IndustryDomainType,
} from "@/feedback/types";
import {
  pearsonr,
  normalizeWeights,
  weightsToFractions,
} from "@/feedback/stats";
import { INDUSTRY_WEIGHT_PROFILES } from "@/scoring/v3/industry-weights";
import { sendOpsAlert } from "@/lib/ops-alerts";

const LEARNING_RATE = 0.05;
const MIN_DECISIONS = 50;
const LOOKBACK_DAYS = 90;

function extractComponentScore(
  breakdown: unknown,
  component: string
): number | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const b = breakdown as Record<string, unknown>;
  const entry = b[component];
  if (entry == null) return null;
  if (typeof entry === "number") return entry;
  if (typeof entry === "object" && entry !== null && "score" in entry) {
    const score = (entry as { score: unknown }).score;
    return typeof score === "number" ? score : null;
  }
  return null;
}

function outcomeLabel(signalType: string): number {
  if (signalType === "POSITIVE") return 1;
  return 0;
}

function getBaseFractions(industryDomain: IndustryDomainType): FractionWeightProfile {
  const profile =
    industryDomain in INDUSTRY_WEIGHT_PROFILES
      ? INDUSTRY_WEIGHT_PROFILES[industryDomain as keyof typeof INDUSTRY_WEIGHT_PROFILES]
      : INDUSTRY_WEIGHT_PROFILES.GENERAL;
  return weightsToFractions(profile);
}

export class WeightRecalibrator {
  static async recalibrateWeights(): Promise<{
    profilesUpdated: number;
    runs: Array<{ tenantId: string; industryDomain: string }>;
  }> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const runs: Array<{ tenantId: string; industryDomain: string }> = [];
    let profilesUpdated = 0;

    const tenantRolePairs = await prisma.recruiterDecision.groupBy({
      by: ["tenantId"],
      where: { decidedAt: { gte: since } },
      _count: { id: true },
    });

    const tenantIds = new Set<string>([GLOBAL_TENANT_ID]);
    for (const row of tenantRolePairs) {
      tenantIds.add(row.tenantId);
    }

    for (const tenantId of tenantIds) {
      for (const industryDomain of INDUSTRY_DOMAINS) {
        const decisions = await prisma.recruiterDecision.findMany({
          where: {
            ...(tenantId === GLOBAL_TENANT_ID ? {} : { tenantId }),
            roleType: industryDomain,
            decidedAt: { gte: since },
          },
          select: {
            scoreBreakdown: true,
            signalType: true,
          },
        });

        if (decisions.length < MIN_DECISIONS) continue;

        const outcomes = decisions.map((d) => outcomeLabel(d.signalType));
        const oldFractions = await WeightRecalibrator.loadFractions(tenantId, industryDomain);
        const correlations: Record<string, number> = {};
        const adjusted: FractionWeightProfile = { ...oldFractions };

        for (const component of SCORE_COMPONENTS) {
          const scores = decisions.map((d) =>
            extractComponentScore(d.scoreBreakdown, component)
          );
          const pairs = scores
            .map((s, i) => (s != null ? { s, o: outcomes[i] } : null))
            .filter((p): p is { s: number; o: number } => p != null);

          if (pairs.length < MIN_DECISIONS) {
            correlations[component] = 0;
            continue;
          }

          const r = pearsonr(
            pairs.map((p) => p.s),
            pairs.map((p) => p.o)
          );
          correlations[component] = r;
          adjusted[component] = oldFractions[component] + LEARNING_RATE * (r - 0.5);
        }

        const normalized = normalizeWeights(adjusted);
        const deltas = Object.fromEntries(
          SCORE_COMPONENTS.map((k) => [k, normalized[k] - oldFractions[k]])
        );

        await prisma.tenantWeightProfile.upsert({
          where: {
            tenantId_roleType: { tenantId, roleType: industryDomain },
          },
          create: {
            tenantId,
            roleType: industryDomain,
            weights: normalized as unknown as Prisma.InputJsonValue,
          },
          update: {
            weights: normalized as unknown as Prisma.InputJsonValue,
          },
        });

        await prisma.weightRecalibrationRun.create({
          data: {
            tenantId,
            roleType: industryDomain,
            componentDeltas: deltas as Prisma.InputJsonValue,
            correlations: correlations as Prisma.InputJsonValue,
          },
        });

        const gained = SCORE_COMPONENTS.filter((k) => deltas[k] > 0.001)
          .map((k) => `${k}(+${(deltas[k] * 100).toFixed(1)}%)`)
          .join(", ");
        const lost = SCORE_COMPONENTS.filter((k) => deltas[k] < -0.001)
          .map((k) => `${k}(${(deltas[k] * 100).toFixed(1)}%)`)
          .join(", ");

        console.log("[retrainer]", {
          tenantId,
          industryDomain,
          decisionCount: decisions.length,
          gained,
          lost,
          correlations,
        });

        runs.push({ tenantId, industryDomain });
        profilesUpdated++;
      }
    }

    if (profilesUpdated > 0) {
      await sendOpsAlert({
        subject: "Weekly weight recalibration complete",
        body: `Updated ${profilesUpdated} tenant/industry weight profiles. Runs: ${runs.map((r) => `${r.tenantId}/${r.industryDomain}`).join(", ")}`,
        severity: "info",
      });
    }

    return { profilesUpdated, runs };
  }

  static async loadFractions(
    tenantId: string,
    industryDomain: IndustryDomainType
  ): Promise<FractionWeightProfile> {
    const row = await prisma.tenantWeightProfile.findUnique({
      where: { tenantId_roleType: { tenantId, roleType: industryDomain } },
    });
    if (row?.weights && typeof row.weights === "object") {
      return row.weights as FractionWeightProfile;
    }
    return getBaseFractions(industryDomain);
  }
}
