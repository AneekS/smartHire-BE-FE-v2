import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { refreshCompleteness } from "@/services/profile/completeness.service";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

export class RoleIntelligenceService {
  async listByUserEmail(email: string) {
    const candidate = await prisma.candidate.findFirst({
      where: { email },
      select: {
        preferredRoles: {
          orderBy: [{ priority: "asc" }, { confidenceScore: "desc" }],
          select: {
            id: true,
            role: true,
            priority: true,
            confidenceScore: true,
            source: true,
            updatedAt: true,
          },
        },
      },
    });

    return { roles: candidate?.preferredRoles ?? [] };
  }

  async createPreferredRole(email: string, input: { role: string; priority: number }) {
    const candidate = await getOrCreateCandidate(email);
    const normalizedRole = input.role.trim();
    if (!normalizedRole) throw new Error("Role is required");

    await prisma.preferredRole.upsert({
      where: {
        candidateId_role: {
          candidateId: candidate.id,
          role: normalizedRole,
        },
      },
      create: {
        candidateId: candidate.id,
        role: normalizedRole,
        priority: input.priority,
        source: "MANUAL",
        confidenceScore: 0.7,
      },
      update: {
        priority: input.priority,
        source: "MANUAL",
        confidenceScore: 0.7,
      },
    });

    await refreshCompleteness(candidate.id);
    return this.listByUserEmail(email);
  }

  private async getOwnedPreferredRole(roleId: string, email: string) {
    return prisma.preferredRole.findFirst({
      where: { id: roleId, candidate: { email } },
      select: { id: true, candidateId: true, role: true, priority: true },
    });
  }

  async deletePreferredRole(email: string, roleId: string) {
    const row = await this.getOwnedPreferredRole(roleId, email);
    if (!row) throw new Error("Preferred role not found");

    await prisma.preferredRole.delete({ where: { id: roleId } });
    await refreshCompleteness(row.candidateId);
    return this.listByUserEmail(email);
  }

  async recordBehaviorSignal(input: {
    email: string;
    roleHint: string;
    eventType: "JOB_VIEW" | "JOB_CLICK" | "JOB_APPLICATION";
    durationSeconds?: number;
  }) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (!user) return;
    const role = this.toCanonicalRole(input.roleHint);
    if (!role) return;

    const increment: Prisma.UserBehaviorSignalUpdateInput = {
      viewedJobs: input.eventType === "JOB_VIEW" ? { increment: 1 } : undefined,
      clickedRoles: input.eventType === "JOB_CLICK" ? { increment: 1 } : undefined,
      appliedJobs: input.eventType === "JOB_APPLICATION" ? { increment: 1 } : undefined,
      timeSpentPerRole: input.durationSeconds ? { increment: input.durationSeconds } : undefined,
    };

    await prisma.userBehaviorSignal.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: {
        userId: user.id,
        role,
        viewedJobs: input.eventType === "JOB_VIEW" ? 1 : 0,
        clickedRoles: input.eventType === "JOB_CLICK" ? 1 : 0,
        appliedJobs: input.eventType === "JOB_APPLICATION" ? 1 : 0,
        timeSpentPerRole: input.durationSeconds ?? 0,
      },
      update: increment,
    });
  }

  private toCanonicalRole(value: string): string {
    const v = value.trim().toLowerCase();
    if (!v) return "";
    if (/(backend|node|api)/.test(v)) return "Backend Developer";
    if (/(frontend|react|ui)/.test(v)) return "Frontend Developer";
    if (/(full[ -]?stack)/.test(v)) return "Full Stack Developer";
    if (/(data analyst|analytics)/.test(v)) return "Data Analyst";
    if (/(machine learning|ml|ai engineer)/.test(v)) return "Machine Learning Engineer";
    if (/(devops|platform|sre)/.test(v)) return "DevOps Engineer";
    return value.length > 60 ? value.slice(0, 60) : value;
  }
}
