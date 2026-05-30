import { prisma } from "@/lib/prisma";
import { ATSEngine } from "@/scoring/ATSEngine";
import { parseResumeSchema } from "@/models/resume.schema";
import { resolveJobForScoring } from "@/lib/job-bridge";
import { scoreEphemeralForListing } from "@/scoring/v3/ephemeral-job-score";

async function resolveResumeVersionV2Id(
  resumeVersionId: string,
  tenantId: string
): Promise<string | null> {
  const direct = await prisma.resumeVersionV2.findFirst({
    where: { id: resumeVersionId, tenantId },
    select: { id: true },
  });
  if (direct) return direct.id;

  const bridge = await prisma.resumeVersionV2.findFirst({
    where: { legacyResumeVersionId: resumeVersionId, tenantId },
    select: { id: true },
  });
  if (bridge) return bridge.id;

  const legacy = await prisma.resumeVersion.findFirst({
    where: { id: resumeVersionId, tenantId },
    include: { resumeVersionV2: { select: { id: true } } },
  });
  return legacy?.resumeVersionV2?.id ?? null;
}

export async function generateAtsScore(input: {
  resumeVersionId: string;
  jobId: string;
  tenantId: string;
  candidateId: string;
}) {
  const v2Id = await resolveResumeVersionV2Id(input.resumeVersionId, input.tenantId);
  if (!v2Id) {
    throw new Error("Resume version not found or not bridged to v2");
  }

  // Prefer Prisma Job (full DB scoring path with JobSkills + persist)
  const job = await resolveJobForScoring(input.jobId, input.tenantId);

  if (job) {
    const score = await ATSEngine.compute(v2Id, job.id, input.tenantId);
    return {
      id: score.id,
      finalScore: score.finalScore,
      confidence: score.confidence,
      requiresManualReview: score.requiresManualReview,
      industryProfile: score.industryProfile,
      seniorityBand: score.seniorityBand,
      computedAt: score.computedAt,
      jobId: job.id,
      resumeVersionId: v2Id,
      pipeline: "ats-v3" as const,
      skillScoreReliable: score.skillScoreReliable,
      percentileRank: score.percentileRank,
      dealbreakers: score.dealbreakers,
      dealbreakerCapApplied: score.dealbreakerCapApplied,
    };
  }

  // Fallback: ephemeral scoring against active listing (no DB persist)
  const listing = await prisma.jobListing.findFirst({
    where: { id: input.jobId, isActive: true },
  });
  if (!listing) {
    throw new Error("Job not found");
  }

  const resumeVersion = await prisma.resumeVersionV2.findFirst({
    where: { id: v2Id, tenantId: input.tenantId },
    include: { parsedResume: true },
  });
  if (!resumeVersion?.parsedResume?.parsedData) {
    throw new Error("Resume not parsed");
  }

  const resume = parseResumeSchema(resumeVersion.parsedResume.parsedData);
  const ephemeral = await scoreEphemeralForListing(resume, listing, {
    tenantId: input.tenantId,
    candidateId: input.candidateId,
    resumeVersionId: v2Id,
    parseConfidence:
      resumeVersion.parseConfidence ??
      resumeVersion.parsedResume.parseConfidence ??
      resume.parseConfidence,
  });

  return {
    id: null as null,
    finalScore: ephemeral.overallScore,
    confidence: ephemeral.scoreConfidence,
    requiresManualReview: ephemeral.requiresManualReview,
    industryProfile: ephemeral.industryDomain,
    seniorityBand: null as null,
    computedAt: new Date(),
    jobId: listing.id,
    resumeVersionId: v2Id,
    pipeline: "ats-v3-ephemeral" as const,
    skillScoreReliable: ephemeral.skillScoreReliable,
    percentileRank: undefined as undefined,
    dealbreakers: ephemeral.dealbreakers,
    dealbreakerCapApplied: ephemeral.dealbreakerCapApplied,
    grade: ephemeral.grade,
    recommendation: ephemeral.recommendation,
    scoreBreakdown: ephemeral.scoreBreakdown,
    flags: ephemeral.flags,
    matchedSkills: ephemeral.matchedSkills,
    missingSkills: ephemeral.missingSkills,
  };
}

export async function getAtsScoreById(id: string, tenantId: string, candidateId?: string) {
  const applicationScore = await prisma.applicationAtsScore.findFirst({
    where: { id, tenantId },
    include: {
      skillGaps: true,
      careerReadiness: true,
      job: { select: { title: true, id: true } },
    },
  });

  if (applicationScore) {
    if (candidateId) {
      const application = await prisma.application.findUnique({
        where: { id: applicationScore.applicationId },
        select: { candidateId: true },
      });
      if (application?.candidateId !== candidateId) {
        return null;
      }
    }

    return {
      source: "application_ats_score" as const,
      data: applicationScore,
    };
  }

  const legacy = await prisma.jobAtsScore.findFirst({
    where: {
      id,
      ...(candidateId ? { candidateId } : {}),
    },
  });

  if (!legacy) return null;

  return {
    source: "job_ats_score" as const,
    data: legacy,
  };
}
