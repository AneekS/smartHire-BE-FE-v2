// Canonical scoring engine — v3. All API paths route here. Do not create parallel final-score functions.

import { prisma } from "@/lib/prisma";

import { AuditLogger } from "@/auth/AuditLogger";

import { parseResumeSchema } from "@/models/resume.schema";

import { SkillCanonicalizer } from "@/scoring/canonicalizer";

import { DealBreakerDetector } from "@/scoring/dealbreaker";

import { ATS_SCORE_METRIC_KEY } from "@/scoring/constants";

import { MetricsCollector } from "@/monitoring/MetricsCollector";

import { computeAllComponents } from "@/scoring/engine";

import { adjustWeightsWithFeedback } from "@/scoring/engine/FeedbackWeightAdjuster";

import { computeFinalScore } from "@/scoring/engine/FinalScoreComputer";

import { selectIndustryWeights } from "@/scoring/engine/IndustryWeightSelector";

import {

  ScoreNormalizer,

} from "@/scoring/engine/ScoreNormalizer";

import { jobSchemaFromPrismaJob } from "@/scoring/job-schema-from-prisma";

import type { AtsComputeResult } from "@/scoring/ATSEngine.types";

import type { JobSchemaType } from "@/models/job.schema";

import {

  mapIndustryToProfile,

  mapSeniorityToPrisma,

  type ComponentScores,

  type ScoringContext,

} from "@/scoring/types";



function startOfDayUtc(d: Date): Date {

  const out = new Date(d);

  out.setUTCHours(0, 0, 0, 0);

  return out;

}



export class ATSEngine {

  static async compute(

    resumeVersionId: string,

    jobId: string,

    tenantId: string,

    options?: { listingId?: string | null }

  ): Promise<AtsComputeResult> {

    const resumeVersion = await prisma.resumeVersionV2.findFirst({

      where: { id: resumeVersionId, tenantId },

      include: {

        parsedResume: true,

        resume: { include: { candidate: true } },

        searchEmbedding: true,

      },

    });



    if (!resumeVersion?.parsedResume?.parsedData) {

      throw new Error("Resume version not found or not parsed");

    }



    const job = await prisma.job.findFirst({

      where: { id: jobId, tenantId },

      include: { jobSkills: true },

    });



    if (!job) {

      throw new Error("Job not found for tenant");

    }



    const candidateId = resumeVersion.resume.candidateId;

    const resume = parseResumeSchema(resumeVersion.parsedResume.parsedData);

    const jobSchema = jobSchemaFromPrismaJob({

      id: job.id,

      title: job.title,

      description: job.description,

      requirements: job.requirements,

      requiredSkills: job.requiredSkills,

      industryProfile: job.industryProfile,

      experienceMin: job.experienceMin,

      experienceMax: job.experienceMax,

      seniorityBand: job.seniorityBand,

      jobSkills: job.jobSkills.map((s) => ({

        name: s.name,

        normalized: s.normalized,

        importance: s.importance,

      })),

    });



    const industry = selectIndustryWeights({

      jobIndustry: jobSchema.industryDomain,

      resumeIndustry: resume.industryDomain,

    }).industryProfile;



    const storedIndustry = mapIndustryToProfile(industry);



    const calibration = await prisma.weightCalibration.findFirst({

      where: {

        tenantId,

        industryProfile: storedIndustry,

        isActive: true,

      },

      orderBy: { calibratedAt: "desc" },

    });



    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const historicalScores = await prisma.applicationAtsScore.findMany({

      where: {

        tenantId,

        industryProfile: storedIndustry,

        computedAt: { gte: since90d },

      },

      select: { finalScore: true },

      take: 1000,

      orderBy: { createdAt: "desc" },

    });



    const historyValues = historicalScores.map((s) => s.finalScore);



    // Only attempt Azure Search vector lookup when the resume has been indexed.
    // When searchEmbedding is null, pass an empty array so SemanticScorer skips
    // the Azure Search round-trip and falls back directly to hash/heuristic scoring.
    const resumeVectors: ScoringContext["resumeVectors"] =
      resumeVersion.searchEmbedding ? undefined : [];

    const ctx: ScoringContext = {

      resume,

      job: jobSchema,

      candidateId,

      tenantId,

      resumeVersionId,

      resumeVectors,

      parseConfidence:

        resumeVersion.parseConfidence ??

        resumeVersion.parsedResume.parseConfidence ??

        resume.parseConfidence,

      currentYear: new Date().getFullYear(),

    };



    const { components, details } = await computeAllComponents(ctx);

    const skillScoreReliable = details.skill.skillScoreReliable !== false;



    const weightSelection = selectIndustryWeights({

      jobIndustry: jobSchema.industryDomain,

      resumeIndustry: resume.industryDomain,

      calibration,

    });



    const weights = adjustWeightsWithFeedback(

      weightSelection.weights,

      weightSelection.industryProfile,

      calibration

    );



    const deal = DealBreakerDetector.check(resume, jobSchema);



    const finalResult = computeFinalScore(components, weights, {

      resumeVersionId,

      jobId,

      resume,

      parseConfidence: ctx.parseConfidence,

      calibrationSampleSize: calibration?.sampleSize ?? 0,

      applyDealbreakerCap: deal.capScore,

    });



    const percentileRank =

      historicalScores.length >= 10

        ? ScoreNormalizer.percentileFromHistory(

            finalResult.overallScore,

            historyValues

          )

        : undefined;



    const overallScore = finalResult.overallScore;

    const dealbreakerCapApplied = deal.capScore;



    const missingSkills = details.skill.missing ?? [];

    const matchedSkills = details.skill.matched ?? [];

    const strengthAreas = matchedSkills.slice(0, 5);

    const developmentAreas = buildDevelopmentAreas(details, missingSkills, deal.triggered);



    const result = await prisma.$transaction(async (tx) => {

      const application = await tx.application.upsert({

        where: { jobId_candidateId: { jobId, candidateId } },

        create: {

          jobId,

          candidateId,

          tenantId,

          resumeVersionV2Id: resumeVersionId,

          status: "APPLIED",

          appliedAt: new Date(),

        },

        update: {

          tenantId,

          resumeVersionV2Id: resumeVersionId,

        },

      });



      const existing = await tx.applicationAtsScore.findUnique({

        where: { applicationId: application.id },

        include: { careerReadiness: true },

      });



      if (existing) {

        await tx.atsSkillGap.deleteMany({ where: { jobAtsScoreId: existing.id } });

        if (existing.careerReadiness) {

          await tx.careerReadiness.delete({ where: { jobAtsScoreId: existing.id } });

        }

        await tx.applicationAtsScore.delete({ where: { id: existing.id } });

      }



      const scoreRow = await tx.applicationAtsScore.create({

        data: {

          tenantId,

          applicationId: application.id,

          resumeVersionId,

          jobId,

          listingId: options?.listingId ?? null,

          finalScore: overallScore,

          semanticScore: components.semanticMatch,

          skillScore: components.skillMatch,

          experienceScore: components.experienceMatch,

          complianceScore: components.atsCompliance,

          projectScore: components.projectRelevance,

          educationScore: components.educationMatch,

          qualityScore: components.resumeQuality,

          confidence: finalResult.scoreConfidence,

          requiresManualReview: finalResult.requiresManualReview,

          scoreHash: finalResult.scoreHash,

          industryProfile: storedIndustry,

          seniorityBand: mapSeniorityToPrisma(resume.seniorityBand),

          scoreVersion: "v3",

        },

      });



      if (missingSkills.length) {

        await tx.atsSkillGap.createMany({

          data: missingSkills.map((skill) => {

            const meta = skillGapMeta(skill, jobSchema);

            return {

              jobAtsScoreId: scoreRow.id,

              tenantId,

              missingSkill: skill,

              importance: meta.isMustHave ? 3 : 1,

              canonicalSkill: meta.canonicalSkill,

            };

          }),

        });

      }



      const readiness = await tx.careerReadiness.create({

        data: {

          jobAtsScoreId: scoreRow.id,

          tenantId,

          overallReadiness: overallScore / 100,

          strengthAreas,

          developmentAreas,

          timeToReady: overallScore >= 75 ? "Ready now" : overallScore >= 60 ? "1-3 months" : "3-6 months",

        },

      });



      const today = startOfDayUtc(new Date());

      await MetricsCollector.upsertAtsScoreDailyMetric(tx, {

        tenantId,

        dayStart: today,

        industryProfile: storedIndustry,

        metricKey: ATS_SCORE_METRIC_KEY,

      });



      await AuditLogger.logWithClient(tx, "ATS_SCORE_COMPUTED", {

        tenantId,

        entityId: scoreRow.id,

        entityType: "ApplicationAtsScore",

        metadata: {

          scoreHash: finalResult.scoreHash,

          jobId,

          resumeVersionId,

          components: components as ComponentScores,

          overallScore,

          percentileRank: percentileRank ?? null,

          weightSource: weightSelection.source,

          skillScoreReliable,

          dealbreakers: deal.triggered,

          dealbreakerCapApplied,

        },

      });



      return tx.applicationAtsScore.findUniqueOrThrow({

        where: { id: scoreRow.id },

        include: { skillGaps: true, careerReadiness: true },

      });

    });



    return Object.assign(result, {

      skillScoreReliable,

      percentileRank,

      dealbreakers: deal.triggered,

      dealbreakerCapApplied,

    });

  }

}



function skillGapMeta(skillName: string, job: JobSchemaType) {

  const req = job.requiredSkills.find(

    (r) =>

      SkillCanonicalizer.normalizeForMatch(r.skillName) ===

      SkillCanonicalizer.normalizeForMatch(skillName)

  );

  return {

    isMustHave: req?.isMustHave ?? false,

    canonicalSkill: SkillCanonicalizer.canonicalize(skillName),

  };

}



function buildDevelopmentAreas(

  details: Record<string, { reason: string; missing?: string[] }>,

  missingSkills: string[],

  dealbreakers: string[]

): string[] {

  const areas: string[] = [];

  for (const skill of missingSkills.slice(0, 5)) {

    areas.push(`Develop proficiency in ${skill}`);

  }

  for (const kw of (details.compliance.missing ?? []).slice(0, 3)) {

    areas.push(`Add keyword to resume: ${kw}`);

  }

  for (const db of dealbreakers.slice(0, 2)) {

    areas.push(`Address dealbreaker: ${db}`);

  }

  if (!areas.length) {

    areas.push("Continue strengthening quantified achievements in recent roles");

  }

  return areas;

}


