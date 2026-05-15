import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { candidateOrWhere } from "@/lib/prisma-safe";
import { handleError } from "@/lib/errors";
import { JobSearchSchema } from "@/lib/validators/job.schema";
import { computeSalaryMatchScore } from "@/modules/compensation-service/engines/salary-matching.engine";
import {
  buildJobSearchWhere,
  calculateMatchSummary,
  formatPostedAgo,
} from "@/services/jobs/job-search.service";

type CursorPayload = {
  id: string;
  createdAt: string;
};

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded) as CursorPayload;
    if (!parsed.id || !parsed.createdAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const { searchParams } = new URL(authedReq.url);
      const parsed = JobSearchSchema.parse(Object.fromEntries(searchParams.entries()));

      const baseWhere = buildJobSearchWhere(parsed);
      const cursor = decodeCursor(parsed.cursor);
      const baseAnd = Array.isArray((baseWhere as { AND?: unknown }).AND)
        ? ((baseWhere as { AND?: unknown[] }).AND ?? [])
        : [];

      const where = cursor
        ? {
            ...baseWhere,
            AND: [
              ...baseAnd,
              {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  {
                    AND: [
                      { createdAt: { equals: new Date(cursor.createdAt) } },
                      { id: { lt: cursor.id } },
                    ],
                  },
                ],
              },
            ],
          }
        : baseWhere;

      const candWhereSearch = candidateOrWhere({
        candidateId: authedReq.user?.candidateId,
        email: authedReq.user?.email,
      });
      const candidate = candWhereSearch
        ? await prisma.candidate.findFirst({
            where: candWhereSearch,
            select: {
              skills: true,
              skillRecords: { select: { name: true } },
            },
          })
        : null;

      const candidateSkills = [
        ...(candidate?.skills ?? []),
        ...((candidate?.skillRecords ?? []).map((skill) => skill.name)),
      ];

      const preferredRoleAndSalaryContext = await prisma.user.findFirst({
        where: { email: authedReq.user?.email },
        select: {
          salaryProfile: true,
          candidate: {
            select: {
              preferredRoles: {
                select: { role: true, priority: true, confidenceScore: true },
                orderBy: [{ priority: "asc" }, { confidenceScore: "desc" }],
                take: 5,
              },
            },
          },
        },
      });
      const preferredRoles = preferredRoleAndSalaryContext?.candidate?.preferredRoles ?? [];
      const salaryProfile = preferredRoleAndSalaryContext?.salaryProfile ?? null;

      const whereWithSalarySoftFilter = salaryProfile
        ? {
            ...where,
            AND: [
              ...(Array.isArray((where as { AND?: unknown[] }).AND) ? ((where as { AND?: unknown[] }).AND ?? []) : []),
              {
                OR: [
                  { salaryMax: null },
                  { salaryMax: { gte: salaryProfile.minSalary } },
                ],
              },
            ],
          }
        : where;

      const jobs = await prisma.job.findMany({
        where: whereWithSalarySoftFilter as typeof baseWhere,
        take: parsed.limit * 3 + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          company: true,
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      const hasMore = jobs.length > parsed.limit;
      const pageItems = hasMore ? jobs.slice(0, parsed.limit) : jobs;

      const data = pageItems.map((job) => {
        const jobRecord = job as unknown as Record<string, unknown>;
        const companyRecord = job.company as unknown as Record<string, unknown>;

        const requiredSkills = Array.isArray(jobRecord.requiredSkills)
          ? (jobRecord.requiredSkills as string[])
          : [];
        const experienceLevel =
          typeof jobRecord.experienceLevel === "string"
            ? jobRecord.experienceLevel
            : null;
        const workMode =
          typeof jobRecord.workMode === "string" ? jobRecord.workMode : null;
        const salaryMin =
          typeof jobRecord.salaryMin === "number" ? jobRecord.salaryMin : null;
        const salaryMax =
          typeof jobRecord.salaryMax === "number" ? jobRecord.salaryMax : null;
        const companySize =
          typeof companyRecord.size === "string" ? companyRecord.size : null;
        const companyIndustry =
          typeof companyRecord.industry === "string"
            ? companyRecord.industry
            : null;
        const companyAverageSalaryL =
          typeof companyRecord.averageSalaryL === "number"
            ? companyRecord.averageSalaryL
            : null;
        const companyEmployeeRating =
          typeof companyRecord.employeeRating === "number"
            ? companyRecord.employeeRating
            : null;

        const match = calculateMatchSummary(candidateSkills, requiredSkills);
        const preferredBoost = preferredRoles.reduce((acc, pref) => {
          const target = pref.role.toLowerCase();
          const title = job.title.toLowerCase();
          if (!(title.includes(target) || target.includes(title))) return acc;
          const boost = Math.round(((6 - pref.priority) * 2 + pref.confidenceScore * 8) * 10) / 10;
          return Math.max(acc, boost);
        }, 0);

        const salaryIntelligence = salaryProfile
          ? computeSalaryMatchScore({
              userMinSalary: salaryProfile.minSalary,
              userMaxSalary: salaryProfile.maxSalary,
              userIsNegotiable: salaryProfile.isNegotiable,
              jobMinSalary: salaryMin,
              jobMaxSalary: salaryMax,
            })
          : null;

        return {
          id: job.id,
          title: job.title,
          location: job.location,
          experienceLevel,
          salaryMin,
          salaryMax,
          workMode,
          jobType: job.type,
          skills: requiredSkills,
          postedAt: job.createdAt,
          postedAgo: formatPostedAgo(job.createdAt),
          applicants: job._count.applications,
          trending: job._count.applications >= 100,
          matchScore: Math.min(
            100,
            Math.round(
              match.matchScore +
                preferredBoost +
                ((salaryIntelligence?.score ?? 0.5) * 10 - 5)
            )
          ),
          readiness: match.readiness,
          missingSkills: match.missingSkills,
          salaryMatchScore: salaryIntelligence ? Math.round(salaryIntelligence.score * 100) : null,
          salaryMatchExplanation: salaryIntelligence?.explanation ?? null,
          salaryFitLabel:
            salaryIntelligence && salaryIntelligence.score < 0.5
              ? "Near match - compensation below expectation"
              : "Compensation aligned",
          company: {
            name: job.company.name,
            size: companySize,
            industry: companyIndustry,
            averageSalaryL: companyAverageSalaryL,
            employeeRating: companyEmployeeRating,
          },
        };
      });

      data.sort((a, b) => b.matchScore - a.matchScore);
      const ranked = data.slice(0, parsed.limit);

      const last = ranked[ranked.length - 1];
      const nextCursor = hasMore && last
        ? encodeCursor({
            id: last.id,
            createdAt: new Date(last.postedAt).toISOString(),
          })
        : null;

      return NextResponse.json({ jobs: ranked, nextCursor });
    } catch (error) {
      return handleError(error);
    }
  });
}
