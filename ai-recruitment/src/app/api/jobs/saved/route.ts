import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import { handleError } from "@/lib/errors";
import { calculateMatchSummary, formatPostedAgo } from "@/services/jobs/job-search.service";

type SavedJobRow = {
  id: string;
  title: string;
  location: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  workMode: string | null;
  experienceLevel: string | null;
  requiredSkills: string[];
  createdAt: Date;
  companyName: string;
  companySize: string | null;
  companyIndustry: string | null;
  companyAverageSalaryL: number | null;
  companyEmployeeRating: number | null;
  applicants: number;
};

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      // Cache saved jobs list (5min TTL)
      const savedCacheKey = `saved-jobs:${authedReq.user!.id}`;
      const cachedSaved = await cacheGet<{ jobs: unknown[] }>(savedCacheKey);
      if (cachedSaved) return NextResponse.json(cachedSaved);

      const [savedJobs, candidate] = await Promise.all([
        prisma.$queryRaw<SavedJobRow[]>`
          SELECT
            j."id",
            j."title",
            j."location",
            j."type"::text as "type",
            j."salaryMin",
            j."salaryMax",
            j."workMode"::text as "workMode",
            j."experienceLevel",
            j."requiredSkills",
            j."createdAt",
            c."name" as "companyName",
            c."size" as "companySize",
            c."industry" as "companyIndustry",
            c."averageSalaryL" as "companyAverageSalaryL",
            c."employeeRating" as "companyEmployeeRating",
            (
              SELECT COUNT(*)::int
              FROM "Application" a
              WHERE a."jobId" = j."id"
            ) as "applicants"
          FROM "SavedJob" s
          JOIN "Job" j ON j."id" = s."jobId"
          JOIN "Company" c ON c."id" = j."companyId"
          WHERE s."userId" = ${authedReq.user!.id}
          ORDER BY s."createdAt" DESC
          LIMIT 100
        `,
        prisma.candidate.findFirst({
          where: {
            OR: [{ id: authedReq.user?.candidateId }, { email: authedReq.user?.email }],
          },
          select: {
            skills: true,
            skillRecords: { select: { name: true } },
          },
        }),
      ]);

      const candidateSkills = [
        ...(candidate?.skills ?? []),
        ...((candidate?.skillRecords ?? []).map((skill) => skill.name)),
      ];

      const jobs = savedJobs.map((job) => {
        const match = calculateMatchSummary(candidateSkills, job.requiredSkills ?? []);
        return {
          id: job.id,
          title: job.title,
          location: job.location,
          jobType: job.type,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          workMode: job.workMode,
          experienceLevel: job.experienceLevel,
          skills: job.requiredSkills,
          postedAt: job.createdAt,
          postedAgo: formatPostedAgo(new Date(job.createdAt)),
          applicants: job.applicants,
          trending: job.applicants >= 100,
          matchScore: match.matchScore,
          readiness: match.readiness,
          missingSkills: match.missingSkills,
          company: {
            name: job.companyName,
            size: job.companySize,
            industry: job.companyIndustry,
            averageSalaryL: job.companyAverageSalaryL,
            employeeRating: job.companyEmployeeRating,
          },
          saved: true,
        };
      });

      const response = { jobs };
      await cacheSet(savedCacheKey, response, 300); // 5min TTL
      return NextResponse.json(response);
    } catch (error) {
      return handleError(error);
    }
  });
}
