import { prisma } from "@/lib/prisma";
import type { IndustryProfile } from "@prisma/client";
import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";
import { PromptABAnalyzer } from "@/calibration/PromptABAnalyzer";
import type {
  CalibrationResult,
  SchedulerSummary,
  TenantCalibrationSummary,
} from "@/calibration/types/calibration.types";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { getLogger } from "@/monitoring/logger";

const MIN_NEW_DECISIONS = 10;
const INDUSTRIES: IndustryProfile[] = [
  "TECH",
  "FINANCE",
  "HEALTHCARE",
  "SALES",
  "CREATIVE",
  "LEGAL",
  "GENERAL",
];

function startOfDayUtc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

async function lastRunAt(tenantId: string): Promise<Date> {
  const lastRun = await prisma.weightRecalibrationRun.findFirst({
    where: { tenantId },
    orderBy: { ranAt: "desc" },
    select: { ranAt: true },
  });
  if (lastRun) return lastRun.ranAt;

  const lastCal = await prisma.weightCalibration.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { calibratedAt: "desc" },
    select: { calibratedAt: true },
  });
  return lastCal?.calibratedAt ?? new Date(0);
}

async function writeDailyMetric(
  tenantId: string,
  industry: string,
  key: string,
  value: number
): Promise<void> {
  const today = startOfDayUtc(new Date());
  try {
    await prisma.dailyMetric.upsert({
      where: {
        tenantId_date_metricName_dimension1: {
          tenantId,
          date: today,
          metricName: key,
          dimension1: industry,
        },
      },
      create: {
        tenantId,
        date: today,
        metricKey: key,
        metricName: key,
        metricValue: value,
        value,
        domain: industry,
        dimension1: industry,
      },
      update: {
        value,
        metricValue: value,
      },
    });
  } catch (err) {
    getLogger().warn({ err, tenantId, key }, "DailyMetric upsert failed");
  }
}

async function notifyCalibrationSuccess(
  tenantId: string,
  industry: IndustryProfile,
  result: CalibrationResult
): Promise<void> {
  if (result.status !== "SUCCESS" || !result.newWeights || !result.previousWeights) {
    return;
  }

  const deltas = Object.entries(result.newWeights)
    .map(([k, v]) => {
      const prev =
        result.previousWeights![
          k as keyof typeof result.previousWeights
        ] ?? 0;
      return `${k}: ${(prev * 100).toFixed(1)}% → ${(v * 100).toFixed(1)}%`;
    })
    .join("\n");

  await sendOpsAlert({
    subject: `Weight calibration updated (${tenantId} / ${industry})`,
    body: `Sample size: ${result.sampleSize}\nDiscrimination: ${result.discriminationPower?.toFixed(3)}\n\n${deltas}`,
    severity: "info",
  });
}

export class CalibrationScheduler {
  static async runForTenant(tenantId: string): Promise<TenantCalibrationSummary> {
    const since = await lastRunAt(tenantId);
    const newDecisions = await prisma.recruiterDecision.count({
      where: { tenantId, decidedAt: { gt: since } },
    });

    const industries: CalibrationResult[] = [];
    let promptAb = null;

    if (newDecisions >= MIN_NEW_DECISIONS) {
      for (const industry of INDUSTRIES) {
        const hasDecisions = await prisma.recruiterDecision.count({
          where: {
            tenantId,
            decidedAt: { gte: since },
            OR: [{ decision: "HIRED" }, { decision: "REJECTED" }],
          },
        });
        if (hasDecisions === 0) continue;

        await writeDailyMetric(tenantId, industry, "calibration_runs", 1);
        const result = await WeightCalibrationEngine.run(tenantId, industry);
        industries.push(result);

        if (result.status === "SUCCESS") {
          await writeDailyMetric(
            tenantId,
            industry,
            "calibration_success",
            1
          );
          await writeDailyMetric(
            tenantId,
            industry,
            "discrimination_power",
            result.discriminationPower ?? 0
          );
          await notifyCalibrationSuccess(tenantId, industry, result);
        }
      }
    }

    promptAb = await PromptABAnalyzer.analyze(tenantId);

    return { tenantId, industries, promptAb };
  }

  static async runWeekly(): Promise<SchedulerSummary> {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let tenantsProcessed = 0;
    let calibrationsAttempted = 0;
    let calibrationsSucceeded = 0;
    let promptAnalyses = 0;

    for (const tenant of tenants) {
      const since = await lastRunAt(tenant.id);
      const newDecisions = await prisma.recruiterDecision.count({
        where: { tenantId: tenant.id, decidedAt: { gt: since } },
      });

      if (newDecisions < MIN_NEW_DECISIONS) continue;

      tenantsProcessed += 1;
      const summary = await CalibrationScheduler.runForTenant(tenant.id);
      calibrationsAttempted += summary.industries.length;
      calibrationsSucceeded += summary.industries.filter(
        (r) => r.status === "SUCCESS"
      ).length;
      if (summary.promptAb) promptAnalyses += 1;
    }

    getLogger().info(
      {
        tenantsProcessed,
        calibrationsAttempted,
        calibrationsSucceeded,
        promptAnalyses,
      },
      "CalibrationScheduler.runWeekly complete"
    );

    return {
      tenantsProcessed,
      calibrationsAttempted,
      calibrationsSucceeded,
      promptAnalyses,
    };
  }
}
