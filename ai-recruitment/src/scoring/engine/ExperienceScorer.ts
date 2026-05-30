import { experienceHalfLifeDecay } from "@/scoring/engine/RecencyDecay";
import { scoreSeniorityMatch } from "@/scoring/engine/SeniorityMatcher";
import { resolveCandidateYears } from "@/scoring/experience-years";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

export function scoreExperienceMatch(
  resume: ResumeSchemaType,
  jd: JobSchemaType,
  currentYear?: number
): ComponentDetail {
  const year = currentYear ?? new Date().getFullYear();
  const { years: totalYears, isEstimate: yearsIsEstimated } = resolveCandidateYears(resume);
  const minYears = jd.minYearsExperience ?? 0;
  const maxYears = jd.maxYearsExperience;

  let yearsScore = 70;
  if (minYears > 0) {
    if (totalYears >= minYears) yearsScore = 100;
    else if (totalYears >= minYears - 1) yearsScore = 75;
    else yearsScore = Math.max(20, Math.round((totalYears / minYears) * 60));
  }
  if (maxYears != null && totalYears > maxYears + 2) {
    yearsScore = Math.min(yearsScore, 60);
  }

  let recencyWeighted = 0;
  let recencyTotal = 0;
  for (const exp of resume.experience) {
    const endYear = exp.isCurrent
      ? year
      : exp.endDate
        ? parseInt(exp.endDate.slice(0, 4), 10)
        : year;
    const yearsAgo = Math.max(0, year - endYear);
    const weight = experienceHalfLifeDecay(yearsAgo);
    const roleScore = exp.achievements.length > 0 ? 85 : 70;
    recencyWeighted += roleScore * weight;
    recencyTotal += weight;
  }
  const recencyScore =
    recencyTotal > 0 ? Math.round(recencyWeighted / recencyTotal) : yearsScore;

  const seniority = scoreSeniorityMatch(resume, jd);
  const score = Math.round(yearsScore * 0.45 + recencyScore * 0.35 + seniority.score * 0.2);

  let reason = `Experience ${totalYears}yr vs JD ${minYears}+yr; ${seniority.reason}`;
  if (yearsIsEstimated) {
    reason += "; Years estimated from experience entries (field not parsed)";
  }

  return {
    score,
    reason,
  };
}
