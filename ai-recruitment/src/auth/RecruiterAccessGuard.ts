import { prisma } from "@/lib/prisma";
import { RecruiterDecisionService } from "@/feedback/decisions";
import { addTenantFilter } from "@/auth/TenantIsolation";
import { ForbiddenError } from "@/auth/errors";
import type { Recruiter } from "@prisma/client";

export class RecruiterAccessGuard {
  static async requireRecruiterProfile(userId: string): Promise<Recruiter> {
    const recruiter = await prisma.recruiter.findUnique({
      where: { userId },
    });
    if (!recruiter) {
      throw new ForbiddenError("Recruiter profile required");
    }
    return recruiter;
  }

  static async canAccessJob(
    userId: string,
    jobId: string,
    tenantId: string
  ): Promise<boolean> {
    const job = await prisma.job.findFirst({
      where: addTenantFilter({ id: jobId }, tenantId),
      select: { userId: true },
    });
    if (!job) return false;
    if (job.userId === userId) return true;

    const userCompany = await RecruiterDecisionService.getRecruiterCompanyId(userId);
    if (!userCompany) return false;

    const jobOwner = await prisma.user.findUnique({
      where: { id: job.userId },
      select: { companyId: true },
    });
    return userCompany === jobOwner?.companyId;
  }

  static async assertJobAccess(
    userId: string,
    jobId: string,
    tenantId: string
  ): Promise<void> {
    const allowed = await RecruiterAccessGuard.canAccessJob(userId, jobId, tenantId);
    if (!allowed) {
      throw new ForbiddenError();
    }
  }

  static async canAccessCandidate(
    userId: string,
    candidateId: string,
    tenantId: string
  ): Promise<boolean> {
    await RecruiterAccessGuard.requireRecruiterProfile(userId);
    const candidate = await prisma.candidate.findFirst({
      where: addTenantFilter({ id: candidateId }, tenantId),
      select: { id: true },
    });
    return candidate !== null;
  }
}
