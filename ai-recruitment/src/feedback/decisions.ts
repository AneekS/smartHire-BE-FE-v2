import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  DECISION_SIGNAL,
  GLOBAL_TENANT_ID,
  type RecordDecisionInput,
} from "@/feedback/types";

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;

export class RecruiterDecisionService {
  static resolveTenantId(companyId: string | null | undefined): string {
    return companyId?.trim() || GLOBAL_TENANT_ID;
  }

  static async resolveScoreBreakdown(input: RecordDecisionInput): Promise<unknown | null> {
    if (input.scoreBreakdown != null) return input.scoreBreakdown;

    if (input.candidateId && input.jobSource === "LISTING") {
      const ats = await prisma.jobAtsScore.findUnique({
        where: {
          candidateId_listingId: {
            candidateId: input.candidateId,
            listingId: input.jobId,
          },
        },
      });
      if (ats?.details && typeof ats.details === "object") {
        const details = ats.details as Record<string, unknown>;
        return details.scoreBreakdown ?? details.breakdown ?? details;
      }
    }

    const resume = await prisma.resumeVersion.findUnique({
      where: { id: input.resumeId },
      select: { scoreBreakdown: true, atsScore: true },
    });
    if (resume?.scoreBreakdown) {
      try {
        return JSON.parse(resume.scoreBreakdown);
      } catch {
        return resume.scoreBreakdown;
      }
    }

    return null;
  }

  static async recordDecision(input: RecordDecisionInput) {
    const tenantId = input.tenantId ?? GLOBAL_TENANT_ID;
    const signal = DECISION_SIGNAL[input.decision];
    const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);

    const existing = await prisma.recruiterDecision.findFirst({
      where: {
        resumeId: input.resumeId,
        jobId: input.jobId,
        decision: input.decision,
        decidedAt: { gte: since },
      },
    });
    if (existing) return existing;

    const scoreBreakdown = await RecruiterDecisionService.resolveScoreBreakdown(input);
    let atsScore = input.atsScoreAtDecision;
    if (atsScore == null && scoreBreakdown && typeof scoreBreakdown === "object") {
      const sb = scoreBreakdown as Record<string, unknown>;
      if (typeof sb.overallScore === "number") atsScore = sb.overallScore;
    }

    return prisma.recruiterDecision.create({
      data: {
        resumeId: input.resumeId,
        jobId: input.jobId,
        jobSource: input.jobSource ?? "LEGACY_JOB",
        tenantId,
        decision: input.decision,
        decisionReason: input.decisionReason,
        atsScoreAtDecision: atsScore ?? undefined,
        scoreBreakdown: scoreBreakdown as Prisma.InputJsonValue | undefined,
        recruiterId: input.recruiterId,
        signalType: signal.signalType,
        signalStrength: signal.signalStrength,
        roleType: input.roleType ?? "IC",
      },
    });
  }

  static async getRecruiterCompanyId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    return user?.companyId ?? null;
  }

  static async findCandidateResumeId(candidateId: string): Promise<string | null> {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { userId: true },
    });
    if (!candidate?.userId) return null;

    const active = await prisma.resumeVersion.findFirst({
      where: { userId: candidate.userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    return active?.id ?? null;
  }
}
