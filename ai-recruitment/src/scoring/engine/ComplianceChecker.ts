import { DealBreakerDetector } from "@/scoring/dealbreaker";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

export function scoreAtsCompliance(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const deal = DealBreakerDetector.check(resume, jd);
  let score = 85;

  const hasContact = Boolean(resume.email || resume.phone || resume.fullName);
  const hasSummary = Boolean(resume.summary?.trim());
  const hasExperience = resume.experience.length > 0;
  const hasSkills = resume.skills.length >= 3;

  if (!hasContact) score -= 15;
  if (!hasSummary) score -= 10;
  if (!hasExperience) score -= 25;
  if (!hasSkills) score -= 15;

  const kwHits = jd.mustHaveKeywords.filter((kw) => {
    const blob = [
      resume.summary,
      ...resume.skills.map((s) => s.skillName),
      ...resume.experience.flatMap((e) => e.achievements.map((a) => a.description)),
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(kw.toLowerCase());
  });

  const kwScore =
    jd.mustHaveKeywords.length > 0
      ? Math.round((kwHits.length / jd.mustHaveKeywords.length) * 100)
      : 80;
  score = Math.round(score * 0.6 + kwScore * 0.4);

  const finalScore = Math.max(0, Math.min(100, score));
  const moreDealbreakers =
    deal.triggered.length > 1 ? ` (+${deal.triggered.length - 1} more)` : "";

  return {
    score: finalScore,
    reason:
      deal.triggered.length > 0
        ? `Dealbreaker triggered: ${deal.triggered[0].replace(/^Dealbreaker:\s*/i, "")}${moreDealbreakers} — final score capped at 30`
        : `ATS structure and keyword compliance: ${finalScore}/100`,
    missing: jd.mustHaveKeywords.filter((k) => !kwHits.includes(k)),
  };
}
