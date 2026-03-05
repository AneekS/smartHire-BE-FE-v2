/**
 * Profile Resume Orchestrator
 * Wraps the existing parser and saves results to the candidate profile DB models.
 */

import { prisma }  from "@/lib/db";
import { refreshCompleteness } from "../profile/completeness.service";

export interface AIProfileInsightsData {
  extractedSkills:           string[];
  experienceSummary:         string;
  careerLevel:               string;
  roleReadinessScore:        number;
  skillStrengthDistribution: Record<string, number>;
}

/** Simple category-based skill distribution estimator */
export function buildSkillDistribution(skills: string[]): Record<string, number> {
  const categories: Record<string, string[]> = {
    "Frontend":    ["react", "vue", "angular", "html", "css", "typescript", "javascript", "next", "svelte"],
    "Backend":     ["node", "python", "java", "go", "rust", "express", "fastapi", "spring", "django"],
    "DevOps":      ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "github actions"],
    "Data":        ["sql", "postgresql", "mongodb", "redis", "elasticsearch", "pandas", "spark", "bigquery"],
    "Mobile":      ["react native", "flutter", "swift", "kotlin", "android", "ios"],
    "AI/ML":       ["machine learning", "tensorflow", "pytorch", "nlp", "openai", "langchain", "llm"],
    "Soft Skills": ["leadership", "communication", "teamwork", "agile", "scrum", "problem solving"],
  };

  const counts: Record<string, number> = {};
  const lowerSkills = skills.map((s) => s.toLowerCase());

  for (const [cat, keywords] of Object.entries(categories)) {
    const hits = lowerSkills.filter((s) =>
      keywords.some((kw) => s.includes(kw))
    ).length;
    if (hits > 0) {
      counts[cat] = Math.min(100, Math.round(hits * 25));
    }
  }

  return counts;
}

/** Estimate career level from years of experience */
export function estimateCareerLevel(
  totalMonthsExperience: number
): "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "EXECUTIVE" {
  if (totalMonthsExperience < 18) return "JUNIOR";
  if (totalMonthsExperience < 48) return "MID";
  if (totalMonthsExperience < 96) return "SENIOR";
  if (totalMonthsExperience < 168) return "LEAD";
  return "EXECUTIVE";
}

/**
 * Persist AI-derived insights into the database after a resume is parsed.
 * Called from resume upload routes.
 */
export async function persistAIInsights(
  candidateId: string,
  insights:    AIProfileInsightsData,
  fileUrl:     string,
  rawText:     string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update resume URL on candidate
    await tx.candidate.update({
      where: { id: candidateId },
      data:  { resumeUrl: fileUrl, summary: insights.experienceSummary || undefined },
    });

    // Ensure CandidateProfile row exists (AI pipeline hub)
    const profile = await tx.candidateProfile.upsert({
      where:  { candidateId },
      create: { candidateId },
      update: {},
      select: { id: true },
    });

    // Raw resume text
    await tx.resumeRaw.upsert({
      where:  { profileId: profile.id },
      create: { profileId: profile.id, fileUrl, extractedText: rawText },
      update: { fileUrl, extractedText: rawText, uploadedAt: new Date() },
    });

    // AI insights
    await tx.aIProfileInsights.upsert({
      where:  { candidateId },
      create: {
        candidateId,
        extractedSkills:           insights.extractedSkills,
        experienceSummary:         insights.experienceSummary,
        careerLevel:               insights.careerLevel,
        roleReadinessScore:        insights.roleReadinessScore,
        skillStrengthDistribution: insights.skillStrengthDistribution,
        lastAnalyzedAt:            new Date(),
      },
      update: {
        extractedSkills:           insights.extractedSkills,
        experienceSummary:         insights.experienceSummary,
        careerLevel:               insights.careerLevel,
        roleReadinessScore:        insights.roleReadinessScore,
        skillStrengthDistribution: insights.skillStrengthDistribution,
        lastAnalyzedAt:            new Date(),
      },
    });
  });

  // Refresh completeness (resume = 20%)
  await refreshCompleteness(candidateId);
}
