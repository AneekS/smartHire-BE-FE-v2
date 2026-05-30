import { ATSEngine } from "@/scoring/ATSEngine";

import { prisma } from "@/lib/prisma";

import {

  scoreToGrade,

  scoreToRecommendation,

} from "@/models/scoring.schema";

import type { JobSchemaType } from "@/models/job.schema";

import type { ResumeSchemaType } from "@/models/resume.schema";

import { buildScoreBreakdown } from "@/scoring/v3/build-breakdown";

import { scoreGeneralResume } from "@/scoring/v3/general-score";

import { generateExplainability } from "@/scoring/v3/explainability";

import { scoreEphemeralForListing } from "@/scoring/v3/ephemeral-job-score";

import {

  getIndustryWeights,

  resolveIndustry,

} from "@/scoring/v3/industry-weights";

import type {

  GeneralScoreResult,

  JobScoreResult,

} from "@/scoring/v3/types";



export interface JobScoreOptions {

  tenantId?: string;

  parseConfidence?: number;

  skipNarrative?: boolean;

  currentYear?: number;

  resumeVersionId?: string;

  jobId?: string;

  persist?: boolean;

}



async function resolveResumeVersionV2Id(

  candidateId: string,

  tenantId: string | undefined,

  hintId?: string

): Promise<string | null> {

  if (hintId) {

    const direct = await prisma.resumeVersionV2.findUnique({

      where: { id: hintId },

      select: { id: true },

    });

    if (direct) return direct.id;



    const bridge = await prisma.resumeVersionV2.findFirst({

      where: { legacyResumeVersionId: hintId },

      select: { id: true },

    });

    if (bridge) return bridge.id;

  }



  const resume = await prisma.resume.findFirst({

    where: {

      candidateId,

      ...(tenantId ? { tenantId } : {}),

      isActive: true,

    },

    include: { currentVersion: true },

    orderBy: { updatedAt: "desc" },

  });



  return resume?.currentVersion?.id ?? resume?.currentVersionId ?? null;

}



function mapPersistedToJobScore(

  row: {

    finalScore: number;

    confidence: number;

    requiresManualReview: boolean;

    industryProfile: string;

    semanticScore: number;

    skillScore: number;

    experienceScore: number;

    complianceScore: number;

    projectScore: number;

    educationScore: number;

    qualityScore: number;

    skillGaps: Array<{ missingSkill: string }>;

    careerReadiness: {

      strengthAreas: unknown;

      developmentAreas: unknown;

    } | null;

  },

  job: JobSchemaType,

  industry: ReturnType<typeof resolveIndustry>,

  dealbreakers: string[],

  extras: {

    skillScoreReliable?: boolean;

    percentileRank?: number;

    dealbreakerCapApplied?: boolean;

  } = {}

): JobScoreResult {

  const components = {

    semanticMatch: row.semanticScore,

    skillMatch: row.skillScore,

    experienceMatch: row.experienceScore,

    atsCompliance: row.complianceScore,

    projectRelevance: row.projectScore,

    educationMatch: row.educationScore,

    resumeQuality: row.qualityScore,

  };

  const weights = getIndustryWeights(industry);

  const overallScore = Math.round(row.finalScore);

  const matchedSkills = (row.careerReadiness?.strengthAreas as string[]) ?? [];

  const missingSkills = row.skillGaps.map((g) => g.missingSkill);

  const reasons = (row.careerReadiness?.developmentAreas as string[]) ?? [];



  const flags: string[] = [];

  if (row.requiresManualReview) flags.push("LOW_CONFIDENCE");

  if (extras.skillScoreReliable === false) flags.push("SKILL_MATCH_UNRELIABLE");

  if (extras.dealbreakerCapApplied) flags.push("DEALBREAKER_CAP_APPLIED");



  return {

    overallScore,

    grade: scoreToGrade(overallScore),

    recommendation: scoreToRecommendation(overallScore, dealbreakers),

    scoreBreakdown: buildScoreBreakdown(components, weights, {}),

    dealbreakers,

    flags,

    topStrengths: matchedSkills.slice(0, 3),

    topGaps: missingSkills.slice(0, 3),

    matchedSkills,

    missingSkills,

    reasons,

    scoreConfidence: row.confidence,

    requiresManualReview: row.requiresManualReview,

    industryDomain: industry,

    pipeline: "ats-v3",

    skillScoreReliable: extras.skillScoreReliable,

    percentileRank: extras.percentileRank,

    dealbreakerCapApplied: extras.dealbreakerCapApplied,

  };

}



export class AtsEngineV3 {

  static async scoreGeneral(

    resume: ResumeSchemaType,

    parseConfidence?: number,

    currentYear = 2026

  ): Promise<GeneralScoreResult> {

    return scoreGeneralResume(resume, parseConfidence, currentYear);

  }



  static async scoreForJob(

    resume: ResumeSchemaType,

    job: JobSchemaType,

    candidateId: string,

    options: JobScoreOptions = {}

  ): Promise<JobScoreResult> {

    const tenantId = options.tenantId;

    if (!tenantId) {

      throw new Error("tenantId is required for job scoring");

    }



    const jobId = options.jobId ?? job.jobId;

    if (!jobId) {

      throw new Error("jobId is required for job scoring");

    }



    const resumeVersionId =

      (await resolveResumeVersionV2Id(candidateId, tenantId, options.resumeVersionId)) ??

      options.resumeVersionId ??

      null;

    if (!resumeVersionId) {

      throw new Error("Resume version not found or not bridged to v2");

    }



    const prismaJob = await prisma.job.findFirst({

      where: { id: jobId, tenantId },

      select: { id: true },

    });



    if (prismaJob) {

      const persisted = await ATSEngine.compute(resumeVersionId, jobId, tenantId);

      const industry = resolveIndustry(job.industryDomain, resume.industryDomain);

      const base = mapPersistedToJobScore(

        persisted,

        job,

        industry,

        persisted.dealbreakers,

        {

          skillScoreReliable: persisted.skillScoreReliable,

          percentileRank: persisted.percentileRank,

          dealbreakerCapApplied: persisted.dealbreakerCapApplied,

        }

      );



      if (!options.skipNarrative) {

        const narrative = await generateExplainability({

          jobTitle: job.title,

          industryDomain: industry,

          matchedSkills: base.matchedSkills,

          missingSkills: base.missingSkills,

          dealbreakers: persisted.dealbreakers,

          topStrengths: base.topStrengths,

          topGaps: base.topGaps,

        });

        base.explanation = narrative.explanation;

        if (narrative.reasons?.length) base.reasons = narrative.reasons;

      }



      return base;

    }



    const listing = await prisma.jobListing.findFirst({

      where: { id: jobId, isActive: true },

    });

    if (!listing) {

      throw new Error("Job not found");

    }



    const ephemeral = await scoreEphemeralForListing(resume, listing, {

      tenantId,

      candidateId,

      resumeVersionId,

      parseConfidence: options.parseConfidence ?? resume.parseConfidence,

      currentYear: options.currentYear,

    });



    if (!options.skipNarrative) {

      const narrative = await generateExplainability({

        jobTitle: listing.title,

        industryDomain: ephemeral.industryDomain,

        matchedSkills: ephemeral.matchedSkills,

        missingSkills: ephemeral.missingSkills,

        dealbreakers: ephemeral.dealbreakers,

        topStrengths: ephemeral.topStrengths,

        topGaps: ephemeral.topGaps,

      });

      ephemeral.explanation = narrative.explanation;

      if (narrative.reasons?.length) ephemeral.reasons = narrative.reasons;

    }



    return ephemeral;

  }

  /**
   * Score against a catalog job listing (no Prisma Job row).
   * Uses the v3 component engine via ephemeral-job-score (no DB persist on application_ats_scores).
   */
  static async scoreForJobListing(
    resume: ResumeSchemaType,
    listing: { id: string } & Parameters<typeof scoreEphemeralForListing>[1],
    candidateId: string,
    options: JobScoreOptions = {}
  ): Promise<JobScoreResult> {
    const tenantId = options.tenantId;
    if (!tenantId) {
      throw new Error("tenantId is required for job listing scoring");
    }

    const ephemeral = await scoreEphemeralForListing(resume, listing, {
      tenantId,
      candidateId,
      resumeVersionId: options.resumeVersionId,
      parseConfidence: options.parseConfidence ?? resume.parseConfidence,
      currentYear: options.currentYear,
    });

    if (!options.skipNarrative) {
      const narrative = await generateExplainability({
        jobTitle: listing.title,
        industryDomain: ephemeral.industryDomain,
        matchedSkills: ephemeral.matchedSkills,
        missingSkills: ephemeral.missingSkills,
        dealbreakers: ephemeral.dealbreakers,
        topStrengths: ephemeral.topStrengths,
        topGaps: ephemeral.topGaps,
      });
      ephemeral.explanation = narrative.explanation;
      if (narrative.reasons?.length) ephemeral.reasons = narrative.reasons;
    }

    return ephemeral;
  }

}



/** Facade for routes */

export async function scoreResumeAgainstJob(

  resume: ResumeSchemaType,

  job: JobSchemaType,

  candidateId: string,

  options?: JobScoreOptions | string

): Promise<JobScoreResult> {

  const opts: JobScoreOptions =

    typeof options === "string" ? { tenantId: options } : (options ?? {});

  return AtsEngineV3.scoreForJob(resume, job, candidateId, opts);

}


