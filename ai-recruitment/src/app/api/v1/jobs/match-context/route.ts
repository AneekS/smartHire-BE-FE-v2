import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { parseResumeSchema } from "@/models/resume.schema";
import { resolveJobSchema } from "@/scoring/jd-parser";
import { scoreResumeAgainstJob } from "@/retrieval/match-service";
import { assembleMatchContext } from "@/retrieval/context-assembler";
import { embedText } from "@/embedding/embedder";
import { buildSearchFilter } from "@/embedding/search";
import { hybridRetrieve } from "@/retrieval/hybrid";
import { getRequiredSkillNames } from "@/models/job.schema";

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

      const resume = parseResumeSchema(latestResume.parsedResume.parsedData);
      const job = await resolveJobSchema({
        jobId: jobListingId ?? null,
        jdText: jobDescription ?? "",
        jobTitle,
        companyName,
      });

      const queryText = [
        job.title,
        job.description,
        ...getRequiredSkillNames(job),
      ].join(" ");
      const { vector } = await embedText(queryText);
      const tenantId = latestResume.tenantId ?? candidate.id;
      const filter = buildSearchFilter({
        tenantId,
        candidateId: candidate.id,
        docType: "resume",
      });
      const topChunks = filter
        ? await hybridRetrieve(queryText, vector, { topK: 8, filter }).catch(() => [])
        : [];

      const scoreResult = await scoreResumeAgainstJob(resume, job, candidate.id);

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
