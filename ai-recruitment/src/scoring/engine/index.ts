import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { scoreAtsCompliance } from "@/scoring/engine/ComplianceChecker";
import { scoreEducationMatch } from "@/scoring/engine/EducationScorer";
import { scoreExperienceMatch } from "@/scoring/engine/ExperienceScorer";
import { scoreProjectRelevance } from "@/scoring/engine/ProjectScorer";
import { scoreResumeQuality } from "@/scoring/engine/QualityScorer";
import { scoreSemanticMatch } from "@/scoring/engine/SemanticScorer";
import { scoreSkillMatch } from "@/scoring/engine/SkillMatcher";
import type { ComponentScores, ScorerResults, ScoringContext } from "@/scoring/types";

export async function computeAllComponents(ctx: ScoringContext): Promise<ScorerResults> {
  await SkillCanonicalizer.load();

  const semantic = await scoreSemanticMatch(ctx);
  const skill = scoreSkillMatch(ctx.resume, ctx.job);
  const experience = scoreExperienceMatch(ctx.resume, ctx.job, ctx.currentYear);
  const compliance = scoreAtsCompliance(ctx.resume, ctx.job);
  const project = scoreProjectRelevance(ctx.resume, ctx.job);
  const education = scoreEducationMatch(ctx.resume, ctx.job);
  const quality = scoreResumeQuality(ctx.resume, ctx.parseConfidence);

  const components: ComponentScores = {
    semanticMatch: semantic.score,
    skillMatch: skill.score,
    experienceMatch: experience.score,
    atsCompliance: compliance.score,
    projectRelevance: project.score,
    educationMatch: education.score,
    resumeQuality: quality.score,
  };

  return {
    components,
    details: { semantic, skill, experience, compliance, project, education, quality },
  };
}

export {
  scoreSemanticMatch,
  scoreSkillMatch,
  scoreExperienceMatch,
  scoreAtsCompliance,
  scoreProjectRelevance,
  scoreEducationMatch,
  scoreResumeQuality,
};

export { SEMANTIC_SECTION_WEIGHTS } from "@/scoring/constants";
