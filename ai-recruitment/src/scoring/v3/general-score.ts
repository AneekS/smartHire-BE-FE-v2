import type { ResumeSchemaType } from "@/models/resume.schema";
import type { GeneralScoreResult } from "@/scoring/v3/types";
import { buildScoreBreakdown } from "@/scoring/v3/build-breakdown";
import {
  scoreAtsCompliance,
  scoreEducationMatch,
  scoreExperienceMatch,
  scoreResumeQuality,
  scoreSkillMatch,
} from "@/scoring/v3/components/index";
import { computeFinalAts } from "@/scoring/v3/final-score";
import { getIndustryWeights, resolveIndustry } from "@/scoring/v3/industry-weights";
import type { JobSchemaType } from "@/models/job.schema";

const GENERAL_WEIGHTS = {
  resumeQuality: 0.35,
  atsCompliance: 0.25,
  skillMatch: 0.2,
  experienceMatch: 0.12,
  educationMatch: 0.05,
  projectRelevance: 0.02,
  semanticMatch: 0.01,
};

function stubJob(resume: ResumeSchemaType): JobSchemaType {
  return {
    jobId: "general",
    title: resume.currentTitle ?? "General",
    companyName: "",
    description: resume.summary ?? "",
    industryDomain: resolveIndustry(undefined, resume.industryDomain),
    roleType: "IC",
    seniorityExpected: resume.seniorityBand ?? "L3",
    requiredSkills: [],
    niceToHaveSkills: [],
    keyResponsibilities: [],
    mustHaveKeywords: [],
    dealbreakers: [],
    educationRequirement: "NONE",
    minYearsExperience: null,
    maxYearsExperience: null,
    responsibilities: [],
    requirements: [],
  };
}

export async function scoreGeneralResume(
  resume: ResumeSchemaType,
  parseConfidence?: number,
  currentYear = 2026
): Promise<GeneralScoreResult> {
  const job = stubJob(resume);
  const ctx = { resume, job, candidateId: "general", currentYear, parseConfidence };

  const quality = scoreResumeQuality(resume, parseConfidence);
  const compliance = scoreAtsCompliance(resume, job);
  const skill = scoreSkillMatch(resume, job);
  const experience = scoreExperienceMatch(resume, job, currentYear);
  const education = scoreEducationMatch(resume, job);

  const components = {
    semanticMatch: 50,
    skillMatch: skill.score,
    experienceMatch: experience.score,
    atsCompliance: compliance.score,
    projectRelevance: 50,
    educationMatch: education.score,
    resumeQuality: quality.score,
  };

  const final = computeFinalAts(components, GENERAL_WEIGHTS, { parseConfidence });

  const scoreBreakdown = buildScoreBreakdown(components, GENERAL_WEIGHTS, {
    resumeQuality: quality,
    atsCompliance: compliance,
    skillMatch: skill,
    experienceMatch: experience,
    educationMatch: education,
  });

  return {
    overallScore: final.overallScore,
    scoreConfidence: final.scoreConfidence,
    requiresManualReview: final.requiresManualReview,
    scoreBreakdown,
    flags: final.requiresManualReview ? ["LOW_CONFIDENCE"] : [],
    pipeline: "ats-v3-general",
  };
}
