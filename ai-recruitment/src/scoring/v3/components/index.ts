import { embedText } from "@/embedding/embedder";
import { hybridRetrieve } from "@/retrieval/hybrid";
import { buildSearchFilter, isSearchConfigured } from "@/embedding/search";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { DealBreakerDetector } from "@/scoring/dealbreaker";
import { applyRecencyDecay, experienceHalfLifeDecay } from "@/scoring/recency";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { AtsScoreContext, ComponentDetail, ComponentScoresV3 } from "@/scoring/v3/types";

export const SEMANTIC_SECTION_WEIGHTS: Record<string, number> = {
  EXPERIENCE_RECENT: 1.0,
  SKILLS: 0.85,
  ACHIEVEMENTS: 0.75,
  SUMMARY: 0.6,
  FULL_TEXT: 0.5,
  EDUCATION: 0.4,
  EXPERIENCE_ALL: 0.35,
};

const EDUCATION_RANK: Record<string, number> = {
  NONE: 0,
  HIGH_SCHOOL: 1,
  BACHELORS: 2,
  MASTERS: 3,
  PHD: 4,
};

const SENIORITY_LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;

function findResumeSkill(resume: ResumeSchemaType, skillName: string) {
  const target = SkillCanonicalizer.normalizeForMatch(skillName);
  return resume.skills.find(
    (s) => SkillCanonicalizer.normalizeForMatch(s.skillName) === target
  );
}

function educationRankFromResume(resume: ResumeSchemaType): number {
  let max = 0;
  for (const e of resume.education) {
    const deg = `${e.degree} ${e.field}`.toLowerCase();
    if (/\b(ph\.?d|doctorate)\b/.test(deg)) max = Math.max(max, 4);
    else if (/\b(master|mba|ms|m\.s)\b/.test(deg)) max = Math.max(max, 3);
    else if (/\b(bachelor|bs|ba|b\.s|b\.a)\b/.test(deg)) max = Math.max(max, 2);
    else if (/\b(high\s*school|ged|diploma)\b/.test(deg)) max = Math.max(max, 1);
  }
  return max;
}

function heuristicSemantic(resume: ResumeSchemaType, jd: JobSchemaType): number {
  const terms = [
    jd.title,
    jd.description ?? "",
    ...jd.requiredSkills.map((s) => s.skillName),
    ...jd.keyResponsibilities,
    ...jd.mustHaveKeywords,
  ]
    .join(" ")
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  const unique = [...new Set(terms)];
  if (!unique.length) return 50;
  const blob = [
    resume.summary ?? "",
    resume.currentTitle ?? "",
    ...resume.skills.map((s) => s.skillName),
    ...resume.experience.flatMap((e) => [
      e.title,
      e.company,
      ...e.achievements.map((a) => a.description),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  const hits = unique.filter((t) => blob.includes(t)).length;
  return Math.min(100, Math.round((hits / unique.length) * 100));
}

export async function scoreSemanticMatch(ctx: AtsScoreContext): Promise<ComponentDetail> {
  const { resume, job, candidateId, tenantId } = ctx;
  const configured = await isSearchConfigured().catch(() => false);
  if (!configured) {
    const score = heuristicSemantic(resume, job);
    return { score, reason: `Keyword overlap heuristic: ${score}/100` };
  }

  const queryText = [
    job.title,
    job.description,
    ...job.requiredSkills.map((s) => s.skillName),
    ...job.keyResponsibilities,
  ].join(" ");

  const filter = buildSearchFilter({ tenantId, candidateId, docType: "resume" });
  if (!filter) {
    const score = heuristicSemantic(resume, job);
    return { score, reason: `Heuristic semantic (no tenant filter): ${score}/100` };
  }

  try {
    const { vector } = await embedText(queryText);
    const hits = await hybridRetrieve(queryText, vector, { topK: 12, filter });
    if (!hits.length) {
      const score = heuristicSemantic(resume, job);
      return { score, reason: `No vector hits; heuristic ${score}/100` };
    }

    let weightedSum = 0;
    let weightTotal = 0;
    const maxScore = Math.max(...hits.map((h) => h.score), 1);
    for (const hit of hits) {
      const sw = SEMANTIC_SECTION_WEIGHTS[hit.section] ?? 0.5;
      const normalized = Math.min(100, (hit.score / maxScore) * 100);
      const w = sw * (hit.fusedScore || 1);
      weightedSum += normalized * w;
      weightTotal += w;
    }
    const score = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : heuristicSemantic(resume, job);
    return { score, reason: `Vector + keyword hybrid alignment: ${score}/100` };
  } catch {
    const score = heuristicSemantic(resume, job);
    return { score, reason: `Search unavailable; heuristic ${score}/100` };
  }
}

export function scoreSkillMatch(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const required = jd.requiredSkills;
  if (!required.length) {
    return { score: 70, reason: "No required skills in JD", matched: [], missing: [] };
  }

  const matched: string[] = [];
  const missing: string[] = [];
  let total = 0;
  let mustHaveMissing = 0;
  const currentYear = new Date().getFullYear();

  for (const req of required) {
    const skill = findResumeSkill(resume, req.skillName);
    if (!skill) {
      missing.push(req.skillName);
      if (req.isMustHave) mustHaveMissing++;
      continue;
    }
    matched.push(req.skillName);
    const levelRatio = Math.min(skill.level / req.minLevel, 1);
    const recency = applyRecencyDecay(skill.lastUsedYear, currentYear);
    total += Math.min(100, levelRatio * recency * 100);
  }

  let score = Math.round(total / required.length);
  if (mustHaveMissing > 0) score = Math.max(0, score - 20 * mustHaveMissing);

  const bonus: string[] = [];
  for (const nice of jd.niceToHaveSkills) {
    if (findResumeSkill(resume, nice.skillName)) bonus.push(nice.skillName);
  }

  return {
    score: Math.min(100, score),
    matched,
    missing,
    bonus,
    reason: `Matched ${matched.length}/${required.length} required skills`,
  };
}

export function scoreExperienceMatch(
  resume: ResumeSchemaType,
  jd: JobSchemaType,
  currentYear?: number
): ComponentDetail {
  const year = currentYear ?? 2026;
  const candidateYears = resume.yearsOfExperience ?? 0;
  const minYears = jd.minYearsExperience ?? 0;
  const maxYears = jd.maxYearsExperience;

  let yearsScore = 70;
  if (minYears > 0) {
    if (candidateYears >= minYears) yearsScore = 100;
    else if (candidateYears >= minYears - 1) yearsScore = 75;
    else yearsScore = Math.max(20, Math.round((candidateYears / minYears) * 60));
  }
  if (maxYears != null && candidateYears > maxYears + 2) {
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
    const startYear = exp.startDate ? parseInt(exp.startDate.slice(0, 4), 10) : endYear - 2;
    const yearsAgo = Math.max(0, year - endYear);
    const weight = experienceHalfLifeDecay(yearsAgo);
    const roleScore = exp.achievements.length > 0 ? 85 : 70;
    recencyWeighted += roleScore * weight;
    recencyTotal += weight;
  }
  const recencyScore =
    recencyTotal > 0 ? Math.round(recencyWeighted / recencyTotal) : yearsScore;

  const cIdx = SENIORITY_LEVELS.indexOf(
    (resume.seniorityBand ?? "L3") as (typeof SENIORITY_LEVELS)[number]
  );
  const eIdx = SENIORITY_LEVELS.indexOf(
    (jd.seniorityExpected ?? "L3") as (typeof SENIORITY_LEVELS)[number]
  );
  let seniorityScore = 70;
  if (cIdx >= 0 && eIdx >= 0) {
    const diff = Math.abs(cIdx - eIdx);
    if (diff === 0) seniorityScore = 100;
    else if (diff === 1) seniorityScore = 75;
    else seniorityScore = 45;
  }

  const score = Math.round(yearsScore * 0.45 + recencyScore * 0.35 + seniorityScore * 0.2);
  return {
    score,
    reason: `Experience ${candidateYears}yr vs JD ${minYears}+yr; recency-weighted roles`,
  };
}

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

  if (deal.triggered.length) score = Math.min(score, 35);

  return {
    score: Math.max(0, Math.min(100, score)),
    reason:
      deal.triggered.length > 0
        ? `Compliance issues: ${deal.triggered.join("; ")}`
        : `ATS structure and keyword compliance: ${score}/100`,
    missing: jd.mustHaveKeywords.filter((k) => !kwHits.includes(k)),
  };
}

export function scoreProjectRelevance(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const jdTech = new Set(
    [
      ...jd.requiredSkills.map((s) => s.skillName.toLowerCase()),
      ...jd.keyResponsibilities.join(" ").toLowerCase().split(/\W+/),
    ].filter((t) => t.length > 2)
  );

  const blobs = resume.experience.map((e) =>
    [
      e.title,
      e.company,
      ...e.achievements.map((a) => a.description),
    ].join(" ").toLowerCase()
  );

  if (!blobs.length) {
    return { score: 40, reason: "No experience entries for project-style relevance" };
  }

  let best = 0;
  for (const blob of blobs) {
    const hits = [...jdTech].filter((t) => blob.includes(t)).length;
    const ratio = jdTech.size > 0 ? hits / jdTech.size : 0.5;
    best = Math.max(best, Math.round(ratio * 100));
  }

  return {
    score: best,
    reason: `Experience/project alignment with JD responsibilities: ${best}/100`,
  };
}

export function scoreEducationMatch(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const req = jd.educationRequirement ?? "NONE";
  const candidate = educationRankFromResume(resume);
  const required = EDUCATION_RANK[req] ?? 0;

  if (required === 0) return { score: 80, reason: "No education requirement" };
  if (candidate >= required) return { score: 100, reason: `Meets ${req} requirement` };
  if (candidate === required - 1) return { score: 65, reason: `One level below ${req}` };
  return { score: 35, reason: `Below ${req} requirement` };
}

export function scoreResumeQuality(
  resume: ResumeSchemaType,
  parseConfidence?: number
): ComponentDetail {
  let score = 50;

  if (resume.fullName?.trim()) score += 8;
  if (resume.summary?.trim()) score += 12;
  if (resume.skills.length >= 5) score += 15;
  else if (resume.skills.length >= 3) score += 8;
  if (resume.experience.length >= 2) score += 15;
  else if (resume.experience.length >= 1) score += 8;
  if (resume.education.length > 0) score += 8;

  const quantified = resume.experience.reduce(
    (n, e) =>
      n +
      e.achievements.filter((a) => /[%$]|\d+\s*(users|ms|sec|team)/i.test(a.description)).length,
    0
  );
  score += Math.min(15, quantified * 4);

  if (parseConfidence != null) {
    score = Math.round(score * 0.7 + parseConfidence * 100 * 0.3);
  }

  return {
    score: Math.min(100, score),
    reason: `Resume completeness and quantified achievements`,
  };
}

export async function computeAllComponents(
  ctx: AtsScoreContext
): Promise<{ components: ComponentScoresV3; details: Record<string, ComponentDetail> }> {
  await SkillCanonicalizer.load();
  const semantic = await scoreSemanticMatch(ctx);
  const skill = scoreSkillMatch(ctx.resume, ctx.job);
  const experience = scoreExperienceMatch(ctx.resume, ctx.job, ctx.currentYear);
  const compliance = scoreAtsCompliance(ctx.resume, ctx.job);
  const project = scoreProjectRelevance(ctx.resume, ctx.job);
  const education = scoreEducationMatch(ctx.resume, ctx.job);
  const quality = scoreResumeQuality(ctx.resume, ctx.parseConfidence);

  const components: ComponentScoresV3 = {
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
