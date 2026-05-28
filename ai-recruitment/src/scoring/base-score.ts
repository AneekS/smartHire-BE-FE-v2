import type { ResumeSchemaType } from "@/models/resume.schema";

/** Legacy resume-only ATS score used during parse pipeline. */
export function computeBaseScore(resume: ResumeSchemaType): {
  overallScore: number;
  breakdown: Record<string, number>;
} {
  const skillsScore = scoreSkills(resume);
  const experienceScore = scoreExperience(resume);
  const educationScore = scoreEducation(resume);
  const formatScore = scoreFormat(resume);
  const keywordScore = scoreKeywords(resume);

  const weights = {
    keywords: 30,
    skills: 25,
    experience: 20,
    education: 15,
    format: 10,
  };

  const breakdown = {
    keywordMatch: keywordScore,
    formatting: formatScore,
    experienceMatch: experienceScore,
    skillsAlignment: skillsScore,
  };

  const overallScore = Math.round(
    (keywordScore * weights.keywords +
      skillsScore * weights.skills +
      experienceScore * weights.experience +
      educationScore * weights.education +
      formatScore * weights.format) /
      100
  );

  return { overallScore: Math.min(100, Math.max(0, overallScore)), breakdown };
}

function scoreSkills(resume: ResumeSchemaType): number {
  const n = resume.skills.length;
  if (n === 0) return 30;
  const avgLevel =
    resume.skills.reduce((s, sk) => s + sk.level, 0) / Math.max(n, 1);
  return Math.min(100, 40 + n * 3 + avgLevel * 8);
}

function scoreExperience(resume: ResumeSchemaType): number {
  if (!resume.experience.length) return 25;
  const months = resume.experience.reduce(
    (s, e) => s + (e.durationMonths ?? 12),
    0
  );
  const achievements = resume.experience.reduce(
    (s, e) => s + e.achievements.length,
    0
  );
  return Math.min(100, 30 + months / 3 + achievements * 5);
}

function scoreEducation(resume: ResumeSchemaType): number {
  if (!resume.education.length) return 40;
  return Math.min(100, 50 + resume.education.length * 15);
}

function scoreFormat(resume: ResumeSchemaType): number {
  let score = 50;
  if (resume.fullName) score += 10;
  if (resume.email) score += 10;
  if (resume.summary) score += 15;
  if (resume.parseConfidence > 0.7) score += 15;
  return Math.min(100, score);
}

function scoreKeywords(resume: ResumeSchemaType): number {
  const bullets = resume.experience.flatMap((e) => e.achievements);
  const withMetrics = bullets.filter(
    (a) => a.metricValue || /\d+/.test(a.description)
  ).length;
  if (!bullets.length) return 40;
  return Math.min(100, 50 + (withMetrics / bullets.length) * 50);
}
