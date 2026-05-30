import { prisma } from "@/lib/prisma";
import type { Job } from "@prisma/client";

/**
 * Resolves a Job for scoring within the given tenant only.
 * No cross-tenant fallback — avoids data-isolation leaks.
 */
export async function resolveJobForScoring(
  jobId: string,
  tenantId: string
): Promise<Job | null> {
  return prisma.job.findFirst({
    where: { id: jobId, tenantId, status: "ACTIVE" },
  });
}

export function jobToListingDto(job: Job) {
  return {
    id: job.id,
    title: job.title,
    companyName: null as string | null,
    location: job.location,
    jobType: job.type,
    experienceLevel: job.experienceLevel,
    salaryRange: job.salary,
    description: job.description,
    requirements: job.requirements,
    isActive: job.status === "ACTIVE",
    tenantId: job.tenantId,
  };
}
