import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";

const WORK_KEYWORDS =
  /\b(experience|employment|internship|work history|present|full-time|part-time)\b/i;
const EDU_KEYWORDS =
  /\b(education|university|college|b\.?tech|m\.?tech|bachelor|master|degree|gpa|cgpa|iit)\b/i;
const SKILL_KEYWORDS = /\b(skills|technologies|proficien|competenc)\b/i;

/** True when the resume text clearly has content but extraction is mostly empty. */
export function isSparseExtraction(
  schema: ExtractionResumeSchemaType,
  rawText: string
): boolean {
  const text = rawText.trim();
  if (text.length < 400) return false;

  const hasExperience =
    schema.experience.length > 0 &&
    schema.experience.some((e) => e.company?.trim() || e.title?.trim());
  const hasEducation =
    schema.education.length > 0 &&
    schema.education.some((e) => e.institution?.trim());
  const hasSkills = schema.skills.length >= 3;
  const hasName = Boolean(schema.personalInfo.name?.trim());
  const hasSummary = Boolean(schema.summary?.trim() && schema.summary.length > 20);

  const textSuggestsWork = WORK_KEYWORDS.test(text);
  const textSuggestsEdu = EDU_KEYWORDS.test(text);
  const textSuggestsSkills = SKILL_KEYWORDS.test(text);

  if (textSuggestsWork && !hasExperience) return true;
  if (textSuggestsEdu && !hasEducation) return true;
  if (textSuggestsSkills && !hasSkills) return true;
  if (!hasName && text.split("\n")[0]?.trim().length > 2) return true;
  if (!hasSummary && text.length > 800) return true;

  const filledSections = [hasExperience, hasEducation, hasSkills, hasName].filter(Boolean).length;
  return filledSections < 2 && text.length > 1200;
}

export function extractionQualityScore(schema: ExtractionResumeSchemaType): number {
  let score = 0;
  if (schema.personalInfo.name?.trim()) score += 15;
  if (schema.personalInfo.email?.trim()) score += 10;
  if (schema.summary?.trim()) score += 10;
  score += Math.min(30, schema.experience.length * 10);
  score += Math.min(20, schema.education.length * 10);
  score += Math.min(15, schema.skills.length * 2);
  return score;
}
