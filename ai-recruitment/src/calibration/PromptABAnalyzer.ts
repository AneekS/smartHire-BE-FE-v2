import { prisma } from "@/lib/prisma";
import { getLogger } from "@/monitoring/logger";
import { sendOpsAlert } from "@/lib/ops-alerts";
import type {
  PromptABResult,
  PromptABVariantMetrics,
} from "@/calibration/types/calibration.types";

const LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_EVENTS = 10;
const CONFIDENCE_LIFT_THRESHOLD = 0.05;

function scoreVariant(metrics: PromptABVariantMetrics): number {
  return (
    metrics.avgConfidence * 100 -
    metrics.pass2Rate * 10 -
    metrics.zodRejectionRate * 5
  );
}

export class PromptABAnalyzer {
  static async analyze(tenantId: string): Promise<PromptABResult> {
    const since = new Date(Date.now() - LOOKBACK_MS);
    const variants = await prisma.extractionPromptVariant.findMany({
      where: { tenantId, isActive: true },
    });

    if (!variants.length) {
      return {
        tenantId,
        variants: [],
        winnerId: null,
        confidenceLift: null,
        promoted: false,
      };
    }

    const metrics: PromptABVariantMetrics[] = [];

    for (const variant of variants) {
      const events = await prisma.extractionEvent.findMany({
        where: {
          tenantId,
          promptVariantId: variant.id,
          createdAt: { gte: since },
        },
        select: {
          confidence: true,
          finalConfidence: true,
          pass2Triggered: true,
          pass3Triggered: true,
          zodRejected: true,
        },
      });

      const count = events.length;
      if (count === 0) {
        metrics.push({
          variantId: variant.id,
          variantName: variant.variantName,
          sampleSize: 0,
          avgConfidence: 0,
          pass2Rate: 0,
          pass3Rate: 0,
          zodRejectionRate: 0,
          isControl: variant.isControl,
        });
        continue;
      }

      const avgConfidence =
        events.reduce(
          (sum, e) => sum + (e.finalConfidence ?? e.confidence ?? 0),
          0
        ) / count;
      const pass2Rate =
        events.filter((e) => e.pass2Triggered).length / count;
      const pass3Rate =
        events.filter((e) => e.pass3Triggered).length / count;
      const zodRejectionRate =
        events.filter((e) => e.zodRejected).length / count;

      metrics.push({
        variantId: variant.id,
        variantName: variant.variantName,
        sampleSize: count,
        avgConfidence,
        pass2Rate,
        pass3Rate,
        zodRejectionRate,
        isControl: variant.isControl,
      });
    }

    const eligible = metrics.filter((m) => m.sampleSize >= MIN_EVENTS);
    if (eligible.length < 2) {
      return {
        tenantId,
        variants: metrics,
        winnerId: null,
        confidenceLift: null,
        promoted: false,
      };
    }

    const sorted = [...eligible].sort((a, b) => scoreVariant(b) - scoreVariant(a));
    const winner = sorted[0]!;
    const control =
      eligible.find((m) => m.isControl) ??
      eligible.reduce((best, m) =>
        m.avgConfidence > best.avgConfidence ? m : best
      );

    const confidenceLift =
      control.avgConfidence > 0
        ? (winner.avgConfidence - control.avgConfidence) / control.avgConfidence
        : null;

    let promoted = false;
    if (
      confidenceLift !== null &&
      confidenceLift > CONFIDENCE_LIFT_THRESHOLD &&
      winner.variantId !== control.variantId
    ) {
      const loserIds = variants
        .filter((v) => v.id !== winner.variantId)
        .map((v) => v.id);

      await prisma.extractionPromptVariant.updateMany({
        where: { id: { in: loserIds }, tenantId },
        data: { isActive: false },
      });

      promoted = true;
      getLogger().info(
        { tenantId, winnerId: winner.variantId, confidenceLift },
        "PromptABAnalyzer promoted winner"
      );

      await sendOpsAlert({
        subject: `Prompt A/B winner promoted (${tenantId})`,
        body: `Variant ${winner.variantName} promoted with ${(confidenceLift * 100).toFixed(1)}% confidence lift.`,
        severity: "info",
      });
    }

    return {
      tenantId,
      variants: metrics,
      winnerId: winner.variantId,
      confidenceLift,
      promoted,
    };
  }
}
