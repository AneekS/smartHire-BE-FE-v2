import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { handleError } from "@/lib/errors";
import { JobSearchSchema } from "@/lib/validators/job.schema";
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

      const candidate = await prisma.candidate.findFirst({
        where: {
          OR: [{ id: authedReq.user?.candidateId }, { email: authedReq.user?.email }],
        },
        select: {
          skills: true,
          skillRecords: { select: { name: true } },
        },
      });

      const candidateSkills = [
        ...(candidate?.skills ?? []),
        ...((candidate?.skillRecords ?? []).map((skill) => skill.name)),
      ];

      const jobs = await prisma.job.findMany({
        where: where as typeof baseWhere,
        take: parsed.limit + 1,
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
          matchScore: match.matchScore,
          readiness: match.readiness,
          missingSkills: match.missingSkills,
          company: {
            name: job.company.name,
            size: companySize,
            industry: companyIndustry,
            averageSalaryL: companyAverageSalaryL,
            employeeRating: companyEmployeeRating,
          },
        };
      });

      const last = data[data.length - 1];
      const nextCursor = hasMore && last
        ? encodeCursor({
            id: last.id,
            createdAt: new Date(last.postedAt).toISOString(),
          })
        : null;

      return NextResponse.json({
        jobs: data,
        nextCursor,
      });
    } catch (error) {
      return handleError(error);
    }
  });
}
