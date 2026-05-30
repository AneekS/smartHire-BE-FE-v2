/** Re-export engine scorers for backward compatibility with v3 imports */
export {
  computeAllComponents,
  scoreSemanticMatch,
  scoreSkillMatch,
  scoreExperienceMatch,
  scoreAtsCompliance,
  scoreProjectRelevance,
  scoreEducationMatch,
  scoreResumeQuality,
  SEMANTIC_SECTION_WEIGHTS,
} from "@/scoring/engine";
