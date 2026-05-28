import { DealBreakerDetector } from "@/scoring/dealbreaker";
import { WeightCalibrationEngine } from "@/calibration/weight-calibration-engine";
import {
  scoreToGrade,
  scoreToRecommendation,
} from "@/models/scoring.schema";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import { buildScoreBreakdown } from "@/scoring/v3/build-breakdown";
import { computeAllComponents } from "@/scoring/v3/components/index";
import { computeFinalAts } from "@/scoring/v3/final-score";
import { scoreGeneralResume } from "@/scoring/v3/general-score";
import { generateExplainability } from "@/scoring/v3/explainability";
import {
  getIndustryWeights,
  resolveIndustry,
} from "@/scoring/v3/industry-weights";
import type {
  AtsScoreContext,
  GeneralScoreResult,
  JobScoreResult,
} from "@/scoring/v3/types";

export interface JobScoreOptions {
  tenantId?: string;
  parseConfidence?: number;
  skipNarrative?: boolean;
  currentYear?: number;
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
    const currentYear = options.currentYear ?? 2026;

    const ctx: AtsScoreContext = {
      resume,
      job,
      candidateId,
      tenantId,
      parseConfidence: options.parseConfidence,
      currentYear,
    };

    const industry = resolveIndustry(job.industryDomain, resume.industryDomain);
    const weights = getIndustryWeights(industry);
    const { components, details } = await computeAllComponents(ctx);

    const deal = DealBreakerDetector.check(resume, job);
    const calibration = await WeightCalibrationEngine.getCalibrationFactor(
      tenantId,
      industry
    );

    const final = computeFinalAts(components, weights, {
      parseConfidence: options.parseConfidence,
      industryCalibrationFactor: calibration,
    });

    let overallScore = final.overallScore;
    if (deal.capScore) overallScore = Math.min(30, overallScore);

    const scoreBreakdown = buildScoreBreakdown(components, weights, {
      semanticMatch: details.semantic,
      skillMatch: details.skill,
      experienceMatch: details.experience,
      atsCompliance: details.compliance,
      projectRelevance: details.project,
      educationMatch: details.education,
      resumeQuality: details.quality,
    });

    const matchedSkills = details.skill.matched ?? [];
    const missingSkills = details.skill.missing ?? [];
    const topStrengths = matchedSkills.slice(0, 3);
    const topGaps = missingSkills.slice(0, 3);

    const recommendation = scoreToRecommendation(overallScore, deal.triggered);
    const grade = scoreToGrade(overallScore);

    let explanation: string | undefined;
    let reasons: string[] = topStrengths;

    if (!options.skipNarrative) {
      const narrative = await generateExplainability({
        jobTitle: job.title,
        industryDomain: industry,
        matchedSkills,
        missingSkills,
        dealbreakers: deal.triggered,
        topStrengths,
        topGaps,
      });
      explanation = narrative.explanation;
      if (narrative.reasons?.length) reasons = narrative.reasons;
    }

    return {
      overallScore,
      grade,
      recommendation,
      scoreBreakdown,
      dealbreakers: deal.triggered,
      flags: final.requiresManualReview ? ["LOW_CONFIDENCE", ...deal.triggered] : deal.triggered,
      topStrengths,
      topGaps,
      matchedSkills,
      missingSkills,
      explanation,
      reasons,
      scoreConfidence: final.scoreConfidence,
      requiresManualReview: final.requiresManualReview,
      industryDomain: industry,
      pipeline: "ats-v3",
    };
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
