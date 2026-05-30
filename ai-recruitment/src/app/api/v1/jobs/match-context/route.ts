import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { parseResumeSchema } from "@/models/resume.schema";
import { resolveJobSchema } from "@/scoring/jd-parser";
import { jobSchemaFromPrismaJob } from "@/scoring/job-schema-from-prisma";
import { scoreResumeAgainstJob } from "@/retrieval/match-service";
import { assembleMatchContext } from "@/retrieval/context-assembler";
import { embedText } from "@/embedding/embedder";
import { buildSearchFilter } from "@/embedding/search";
import { hybridRetrieve } from "@/retrieval/hybrid";
import { getRequiredSkillNames } from "@/models/job.schema";

async function resolveResumeVersionV2Id(
  legacyId: string,
  tenantId: string
): Promise<string | null> {
  const direct = await prisma.resumeVersionV2.findFirst({
    where: { id: legacyId, tenantId },
    select: { id: true },
  });
  if (direct) return direct.id;

  const bridge = await prisma.resumeVersionV2.findFirst({
    where: { legacyResumeVersionId: legacyId, tenantId },
    select: { id: true },
  });
  if (bridge) return bridge.id;

  const legacy = await prisma.resumeVersion.findFirst({
    where: { id: legacyId, tenantId },
    include: { resumeVersionV2: { select: { id: true } } },
  });
  return legacy?.resumeVersionV2?.id ?? null;
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const body = await req.json();
      const { jobListingId, jobTitle, companyName, jobDescription } = body ?? {};

      const candidate = await prisma.candidate.findUnique({
        where: { userId: authedReq.user!.id },
        select: { id: true },
      });
      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const latestResume = await prisma.resumeVersion.findFirst({
        where: { userId: authedReq.user!.id },
        orderBy: { createdAt: "desc" },
        include: { parsedResume: true },
      });

      if (!latestResume?.parsedResume?.parsedData) {
        return NextResponse.json(
          { error: "Upload and parse a resume first" },
          { status: 404 }
        );
      }

      const tenantId = latestResume.tenantId ?? candidate.id;

      // Bridge legacy resumeVersion → v2 id for scoreForJob
      const resumeVersionV2Id = await resolveResumeVersionV2Id(
        latestResume.id,
        tenantId
      );

      const resume = parseResumeSchema(latestResume.parsedResume.parsedData);

      // Prefer Prisma Job (DB-authoritative schema + JobSkill) over listing/raw JD
      let job: Awaited<ReturnType<typeof resolveJobSchema>>;
      if (jobListingId) {
        const prismaJob = await prisma.job.findFirst({
          where: { id: jobListingId, tenantId },
          include: { jobSkills: true },
        });
        if (prismaJob) {
          job = jobSchemaFromPrismaJob({
            id: prismaJob.id,
            title: prismaJob.title,
            description: prismaJob.description,
            requirements: prismaJob.requirements,
            requiredSkills: prismaJob.requiredSkills,
            industryProfile: prismaJob.industryProfile,
            experienceMin: prismaJob.experienceMin,
            experienceMax: prismaJob.experienceMax,
            seniorityBand: prismaJob.seniorityBand,
            jobSkills: prismaJob.jobSkills.map((s) => ({
              name: s.name,
              normalized: s.normalized,
              importance: s.importance,
            })),
          });
        } else {
          job = await resolveJobSchema({
            jobId: jobListingId,
            jdText: jobDescription ?? "",
            jobTitle,
            companyName,
          });
        }
      } else {
        job = await resolveJobSchema({
          jobId: null,
          jdText: jobDescription ?? "",
          jobTitle,
          companyName,
        });
      }

      const queryText = [
        job.title,
        job.description,
        ...getRequiredSkillNames(job),
      ].join(" ");
      const { vector } = await embedText(queryText);
      const filter = buildSearchFilter({
        tenantId,
        candidateId: candidate.id,
        docType: "resume",
      });
      const topChunks = filter
        ? await hybridRetrieve(queryText, vector, { topK: 8, filter }).catch(() => [])
        : [];

      const scoreResult = await scoreResumeAgainstJob(resume, job, candidate.id, {
        tenantId,
        jobId: job.jobId,
        resumeVersionId: resumeVersionV2Id ?? latestResume.id,
      });

      const context = assembleMatchContext({
        resume,
        job,
        topChunks,
        matchedSkills: scoreResult.matchedSkills,
        missingSkills: scoreResult.missingSkills,
        dealbreakers: scoreResult.dealbreakers,
      });

      return NextResponse.json({
        context: context.promptContext,
        score: scoreResult,
        chunks: topChunks.map((c) => ({
          id: c.id,
          section: c.section,
          score: c.fusedScore,
        })),
      });
    } catch (e) {
      console.error("[match-context]", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Match failed" },
        { status: 500 }
      );
    }
  });
}
