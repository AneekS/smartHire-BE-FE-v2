import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { twoProportionZTest } from "@/feedback/stats";

const MIN_SAMPLE_SIZE = 200;
const SIGNIFICANCE_LEVEL = 0.05;

export interface VariantAnalyticsRow {
  variantId: string;
  count: bigint | number;
  acceptanceRate: number;
}

export class PromptABTester {
  static hashBucket(resumeId: string): number {
    const hex = createHash("md5").update(resumeId).digest("hex").slice(0, 8);
    return parseInt(hex, 16) % 100;
  }

  static async assignVariant(resumeId: string): Promise<string | null> {
    const existing = await prisma.promptAssignment.findUnique({
      where: { resumeId },
    });
    if (existing) return existing.variantId;

    const variants = await prisma.promptVariant.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    if (variants.length === 0) return null;

    const bucket = PromptABTester.hashBucket(resumeId);
    let cumulative = 0;
    let chosen = variants[variants.length - 1];

    for (const v of variants) {
      cumulative += v.trafficPercent;
      if (bucket < cumulative) {
        chosen = v;
        break;
      }
    }

    await prisma.promptAssignment.create({
      data: {
        resumeId,
        variantId: chosen.variantId,
      },
    });

    return chosen.variantId;
  }

  static async getPromptForResume(resumeId: string): Promise<string | null> {
    const variantId = await PromptABTester.assignVariant(resumeId);
    if (!variantId) return null;

    const variant = await prisma.promptVariant.findUnique({
      where: { variantId },
    });
    return variant?.promptText ?? null;
  }

  static async runAnalytics(): Promise<{
    rows: VariantAnalyticsRow[];
    promoted: boolean;
    winnerId?: string;
  }> {
    const rows = await prisma.$queryRaw<VariantAnalyticsRow[]>`
      SELECT pa."variantId" AS "variantId",
             COUNT(*)::int AS count,
             AVG(CASE WHEN rd.decision IN ('SHORTLISTED', 'HIRED') THEN 1.0 ELSE 0.0 END)::float AS "acceptanceRate"
      FROM prompt_assignments pa
      JOIN recruiter_decisions rd ON rd."resumeId" = pa."resumeId"
      WHERE pa."assignedAt" > NOW() - INTERVAL '30 days'
      GROUP BY pa."variantId"
    `;

    if (rows.length < 2) {
      return { rows, promoted: false };
    }

    const normalized = rows.map((r) => ({
      variantId: r.variantId,
      count: Number(r.count),
      acceptanceRate: Number(r.acceptanceRate),
    }));

    const sorted = [...normalized].sort((a, b) => b.acceptanceRate - a.acceptanceRate);
    const winner = sorted[0];
    const loser = sorted[1];

    if (winner.count < MIN_SAMPLE_SIZE || loser.count < MIN_SAMPLE_SIZE) {
      return { rows: normalized, promoted: false };
    }

    const winnerSuccesses = Math.round(winner.acceptanceRate * winner.count);
    const loserSuccesses = Math.round(loser.acceptanceRate * loser.count);
    const { pValue } = twoProportionZTest(
      winnerSuccesses,
      winner.count,
      loserSuccesses,
      loser.count
    );

    if (pValue >= SIGNIFICANCE_LEVEL) {
      return { rows: normalized, promoted: false };
    }

    await prisma.promptVariant.update({
      where: { variantId: winner.variantId },
      data: { trafficPercent: 100, active: true },
    });

    await prisma.promptVariant.updateMany({
      where: { variantId: { not: winner.variantId }, active: true },
      data: { active: false, trafficPercent: 0 },
    });

    await sendOpsAlert({
      subject: "Prompt A/B test winner promoted",
      body: `Variant ${winner.variantId} promoted (${(winner.acceptanceRate * 100).toFixed(1)}% acceptance, n=${winner.count}, p=${pValue.toFixed(4)}). Loser archived.`,
      severity: "info",
    });

    return { rows: normalized, promoted: true, winnerId: winner.variantId };
  }
}
