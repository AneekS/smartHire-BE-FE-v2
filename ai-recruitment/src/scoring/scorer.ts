import { embedText } from "@/embedding/embedder";
import { hybridRetrieve } from "@/retrieval/hybrid";
import { assembleMatchContext } from "@/retrieval/context-assembler";
import { buildSearchFilter, isSearchConfigured } from "@/embedding/search";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType, JobSkillRequirement } from "@/models/job.schema";
import type { ScoreResult } from "@/models/scoring.schema";
import { scoreLabelFromRecommendation } from "@/models/scoring.schema";
import { DealBreakerDetector } from "@/scoring/dealbreaker";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { applyRecencyDecay } from "@/scoring/recency";
import {
  getWeightProfileForTenant,
  weightedOverall,
  SEMANTIC_SECTION_WEIGHTS,
  SKILL_DOMAIN_MULTIPLIER,
} from "@/scoring/weights";
import { ScoreExplainer, explainScore, type ComponentScores } from "@/scoring/explainer";

const SENIORITY_LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;

const EDUCATION_RANK: Record<string, number> = {
  NONE: 0,
  HIGH_SCHOOL: 1,
  BACHELORS: 2,
  MASTERS: 3,
  PHD: 4,
};

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

function findResumeSkill(resume: ResumeSchemaType, skillName: string) {
  const target = SkillCanonicalizer.normalizeForMatch(skillName);
  return resume.skills.find(
    (s) => SkillCanonicalizer.normalizeForMatch(s.skillName) === target
  );
}

export interface ScoreOptions {
  tenantId?: string;
  /** Skip optional Ollama narrative (faster ATS scoring). */
  skipNarrative?: boolean;
}

export class ResumeScorer {
  async score(
    resume: ResumeSchemaType,
    jd: JobSchemaType,
    candidateId: string,
    options?: ScoreOptions | string
  ): Promise<ScoreResult> {
    const opts: ScoreOptions =
      typeof options === "string" ? { tenantId: options } : (options ?? {});
    const tenantId = opts.tenantId;

    await SkillCanonicalizer.load();

    const dealResult = DealBreakerDetector.check(resume, jd);
    const weights = await getWeightProfileForTenant(jd, tenantId);

    const skillDetail = this.scoreSkills(resume, jd);
    const components: ComponentScores = {
      semanticMatch: await this.scoreSemantic(resume, jd, candidateId, tenantId),
      skillMatch: skillDetail.score,
      seniorityBand: this.scoreSeniority(resume, jd),
      experienceMatch: this.scoreExperience(resume, jd),
      achievementScore: this.scoreAchievements(resume, jd),
      educationMatch: this.scoreEducation(resume, jd),
    };

    let overallScore = weightedOverall(components, weights);

    const scoreBreakdown = ScoreExplainer.buildBreakdown(components, weights, {
      skill: skillDetail,
      semanticReason: components.semanticMatch < 50
        ? "Limited semantic overlap between resume excerpts and job description."
        : `Strong semantic alignment (${components.semanticMatch}/100) from resume chunks vs job requirements.`,
      seniorityReason: this.seniorityReason(resume, jd, components.seniorityBand),
      experienceReason: this.experienceReason(resume, jd, components.experienceMatch),
      achievementReason: `Achievement impact scored ${components.achievementScore}/100 for this role type.`,
      educationReason: `Education scored ${components.educationMatch}/100 vs ${jd.educationRequirement} requirement.`,
      flags: this.collectFlags(resume, jd, components),
    });

    const flags = scoreBreakdown
      ? this.collectFlags(resume, jd, components)
      : [];

    if (dealResult.capScore) {
      overallScore = Math.min(30, overallScore);
    }

    let result = ScoreExplainer.buildResult({
      overallScore,
      components,
      weights,
      scoreBreakdown,
      dealbreakers: dealResult.triggered,
      flags,
      matchedSkills: skillDetail.matched,
      missingSkills: skillDetail.missing,
    });

    if (dealResult.capScore) {
      result = {
        ...result,
        overallScore,
        recommendation: "REJECT",
        grade: "F",
      };
    }

    if (!opts.skipNarrative) {
      try {
        const queryText = [jd.title, jd.description, ...jd.requiredSkills.map((s) => s.skillName)].join(" ");
        const filter = buildSearchFilter({
          tenantId,
          candidateId,
          docType: "resume",
        });
        const topChunks = filter
          ? await (async () => {
              try {
                const { vector } = await embedText(queryText);
                return hybridRetrieve(queryText, vector, { topK: 8, filter });
              } catch {
                return [] as Awaited<ReturnType<typeof hybridRetrieve>>;
              }
            })()
          : [];
        const context = assembleMatchContext({
          resume,
          job: jd,
          topChunks,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          dealbreakers: result.dealbreakers,
        });
        const narrative = await explainScore(context);
        result = {
          ...result,
          explanation: narrative.explanation ?? result.explanation,
          reasons: narrative.reasons?.length ? narrative.reasons : result.reasons,
        };
      } catch {
        /* optional narrative */
      }
    }

    return result;
  }

  private heuristicSemanticScore(resume: ResumeSchemaType, jd: JobSchemaType): number {
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

    const uniqueTerms = [...new Set(terms)];
    if (!uniqueTerms.length) return 50;

    const resumeBlob = [
      resume.summary ?? "",
      resume.currentTitle ?? "",
      ...resume.skills.map((s) => s.skillName),
      ...resume.experience.flatMap((e) => [e.title, e.company, ...e.achievements.map((a) => a.description)]),
    ]
      .join(" ")
      .toLowerCase();

    const hits = uniqueTerms.filter((t) => resumeBlob.includes(t)).length;
    return Math.min(100, Math.round((hits / uniqueTerms.length) * 100));
  }

  private async scoreSemantic(
    resume: ResumeSchemaType,
    jd: JobSchemaType,
    candidateId: string,
    tenantId?: string
  ): Promise<number> {
    const configured = await isSearchConfigured().catch(() => false);
    if (!configured) return this.heuristicSemanticScore(resume, jd);

    const queryText = [
      jd.title,
      jd.description,
      ...jd.requiredSkills.map((s) => s.skillName),
      ...jd.keyResponsibilities,
    ].join(" ");

    const filter = buildSearchFilter({
      tenantId,
      candidateId,
      docType: "resume",
    });
    if (!filter) return this.heuristicSemanticScore(resume, jd);

    try {
      const { vector } = await embedText(queryText);
      const hits = await hybridRetrieve(queryText, vector, { topK: 12, filter });
      if (!hits.length) return this.heuristicSemanticScore(resume, jd);

      let weightedSum = 0;
      let weightTotal = 0;
      const maxScore = Math.max(...hits.map((h) => h.score), 1);

      for (const hit of hits) {
        const sectionWeight = SEMANTIC_SECTION_WEIGHTS[hit.section] ?? 0.5;
        const normalized = Math.min(100, (hit.score / maxScore) * 100);
        const chunkWeight = sectionWeight * (hit.fusedScore || 1);
        weightedSum += normalized * chunkWeight;
        weightTotal += chunkWeight;
      }

      return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : this.heuristicSemanticScore(resume, jd);
    } catch {
      return this.heuristicSemanticScore(resume, jd);
    }
  }

  private scoreSkills(
    resume: ResumeSchemaType,
    jd: JobSchemaType
  ): { score: number; matched: string[]; missing: string[]; bonus: string[] } {
    const required = jd.requiredSkills;
    if (!required.length) {
      return { score: 70, matched: [], missing: [], bonus: [] };
    }

    const matched: string[] = [];
    const missing: string[] = [];
    let total = 0;
    let mustHaveMissing = 0;

    for (const req of required) {
      const skill = findResumeSkill(resume, req.skillName);
      if (!skill) {
        missing.push(req.skillName);
        if (req.isMustHave) mustHaveMissing++;
        continue;
      }
      matched.push(req.skillName);
      const levelRatio = Math.min(skill.level / req.minLevel, 1);
      const recency = applyRecencyDecay(skill.lastUsedYear);
      const domainMult = SKILL_DOMAIN_MULTIPLIER[skill.domain] ?? 1;
      total += Math.min(100, levelRatio * recency * domainMult * 100);
    }

    let score = Math.round(total / required.length);
    if (mustHaveMissing > 0) score = Math.max(0, score - 20 * mustHaveMissing);

    const bonus: string[] = [];
    for (const nice of jd.niceToHaveSkills) {
      if (findResumeSkill(resume, nice.skillName)) {
        bonus.push(nice.skillName);
      }
    }

    return { score: Math.min(100, score), matched, missing, bonus };
  }

  private scoreSeniority(resume: ResumeSchemaType, jd: JobSchemaType): number {
    const candidate = resume.seniorityBand;
    const expected = jd.seniorityExpected;
    if (!candidate || !expected) return 70;

    const cIdx = SENIORITY_LEVELS.indexOf(candidate as (typeof SENIORITY_LEVELS)[number]);
    const eIdx = SENIORITY_LEVELS.indexOf(expected as (typeof SENIORITY_LEVELS)[number]);
    if (cIdx < 0 || eIdx < 0) return 70;

    const diff = Math.abs(cIdx - eIdx);
    if (diff === 0) return 100;
    if (diff === 1) return 70;
    if (diff === 2) return 40;

    if (cIdx > eIdx + 2) {
      if (cIdx >= 5 && eIdx <= 2) return 60;
    }
    return 10;
  }

  private seniorityReason(
    resume: ResumeSchemaType,
    jd: JobSchemaType,
    score: number
  ): string {
    const c = resume.seniorityBand ?? "unknown";
    const e = jd.seniorityExpected ?? "not specified";
    if (score === 60) {
      return `Candidate ${c} vs role ${e} — overqualified; may leave for senior role (score 60).`;
    }
    return `Candidate ${c} vs role ${e} — seniority alignment scored ${score}/100.`;
  }

  private scoreExperience(resume: ResumeSchemaType, jd: JobSchemaType): number {
    const years = resume.yearsOfExperience ?? 0;
    const min = jd.minYearsExperience ?? 0;
    const max = jd.maxYearsExperience ?? 99;

    let base = 70;
    if (years < min) {
      base = Math.max(20, 70 - (min - years) * 15);
    } else if (years > max) {
      base = Math.max(40, 70 - (years - max) * 10);
    } else {
      base = 85 + Math.min(15, (years - min) * 3);
    }

    const currentYear = new Date().getFullYear();
    let recentMonths = 0;
    let olderMonths = 0;
    for (const exp of resume.experience) {
      const months = exp.durationMonths ?? 12;
      const endYear = exp.endDate
        ? parseInt(String(exp.endDate).slice(0, 4), 10)
        : currentYear;
      if (!Number.isNaN(endYear) && currentYear - endYear <= 3) {
        recentMonths += months;
      } else {
        olderMonths += months;
      }
    }
    const recencyBoost =
      recentMonths + olderMonths > 0
        ? (recentMonths * 2 + olderMonths) / (recentMonths + olderMonths)
        : 1;
    base = Math.min(100, Math.round(base * Math.min(1.2, 0.8 + recencyBoost * 0.2)));

    if (
      jd.industryDomain &&
      resume.industryDomain === jd.industryDomain &&
      jd.industryDomain !== "GENERAL"
    ) {
      base = Math.min(100, base + 10);
    }

    if (jd.roleType === "MANAGER" && this.hasTeamManagement(resume)) {
      base = Math.min(100, Math.round(base * 1.05));
    }

    return Math.min(100, base);
  }

  private experienceReason(
    resume: ResumeSchemaType,
    jd: JobSchemaType,
    score: number
  ): string {
    const years = resume.yearsOfExperience ?? 0;
    const min = jd.minYearsExperience;
    const max = jd.maxYearsExperience;
    let msg = `Candidate has ${years} years experience`;
    if (min != null) msg += ` (role requires ${min}`;
    if (max != null && max < 99) msg += `–${max}`;
    if (min != null) msg += " years)";
    msg += `. Score: ${score}/100.`;
    if (resume.industryDomain === jd.industryDomain && jd.industryDomain !== "GENERAL") {
      msg += " Same industry domain (+10 bonus).";
    }
    return msg;
  }

  private hasTeamManagement(resume: ResumeSchemaType): boolean {
    const text = resume.experience
      .flatMap((e) => [e.title, ...e.achievements.map((a) => a.description)])
      .join(" ")
      .toLowerCase();
    return /\b(team of|managed \d+|led team|people management|direct reports)\b/.test(text);
  }

  private scoreAchievements(resume: ResumeSchemaType, jd: JobSchemaType): number {
    const all = resume.experience.flatMap((e) => e.achievements);
    const quantified = all.filter((a) => a.metricType);
    if (!all.length) return 30;

    let score = Math.min(100, 40 + quantified.length * 12);

    if (jd.roleType === "SALES") {
      const salesMetrics = quantified.filter(
        (a) => a.metricType === "$" || a.metricType === "revenue"
      );
      score = Math.min(100, score + salesMetrics.length * 8);
      if (salesMetrics.length) score = Math.min(100, Math.round(score * 1.05));
    }

    if (jd.roleType === "EXECUTIVE" && this.hasExecutiveSignals(resume)) {
      score = Math.min(100, Math.round(score * 1.1));
    }

    return score;
  }

  private hasExecutiveSignals(resume: ResumeSchemaType): boolean {
    const titles = resume.experience.map((e) => e.title.toLowerCase()).join(" ");
    return /\b(ceo|cto|cfo|cio|vp |vice president|chief |board|executive)\b/.test(titles);
  }

  private scoreEducation(resume: ResumeSchemaType, jd: JobSchemaType): number {
    const required = EDUCATION_RANK[jd.educationRequirement] ?? 0;
    const actual = educationRankFromResume(resume);

    if (required === 0) return 100;
    if (actual >= required) return 100;
    const gap = required - actual;
    if (gap === 1) return 80;
    if (gap === 2) return 40;
    return 20;
  }

  private collectFlags(
    resume: ResumeSchemaType,
    jd: JobSchemaType,
    components: ComponentScores
  ): string[] {
    const flags: string[] = [];
    if (components.semanticMatch < 45) flags.push("semantic_unavailable_or_weak");
    if (
      resume.industryDomain !== jd.industryDomain &&
      jd.industryDomain !== "GENERAL"
    ) {
      flags.push("industry_domain_mismatch");
    }
    if (resume.seniorityBand && jd.seniorityExpected) {
      const c = SENIORITY_LEVELS.indexOf(resume.seniorityBand as (typeof SENIORITY_LEVELS)[number]);
      const e = SENIORITY_LEVELS.indexOf(jd.seniorityExpected as (typeof SENIORITY_LEVELS)[number]);
      if (c > e + 2) flags.push("possibly_overqualified");
    }
    return flags;
  }
}

export { scoreLabelFromRecommendation };

/** @deprecated Use ResumeScorer */
export async function computeJobMatchScore(
  resume: ResumeSchemaType,
  requiredSkills: string[] | JobSkillRequirement[]
): Promise<{
  overallScore: number;
  breakdown: Record<string, number>;
  matchedSkills: string[];
  missingSkills: string[];
}> {
  const names = Array.isArray(requiredSkills)
    ? requiredSkills.map((s) => (typeof s === "string" ? s : s.skillName))
    : [];
  const resumeSkills = new Set(
    resume.skills.map((s) => SkillCanonicalizer.normalizeForMatch(s.skillName))
  );
  const matched = names.filter((s) =>
    resumeSkills.has(SkillCanonicalizer.normalizeForMatch(s))
  );
  const missing = names.filter(
    (s) => !resumeSkills.has(SkillCanonicalizer.normalizeForMatch(s))
  );
  const skillsAlignment =
    names.length === 0 ? 70 : Math.round((matched.length / names.length) * 100);
  const { computeBaseScore } = await import("@/scoring/base-score");
  const base = computeBaseScore(resume);
  const semanticMatch = Math.round((skillsAlignment + base.overallScore) / 2);
  return {
    overallScore: semanticMatch,
    breakdown: { ...base.breakdown, semanticMatch, skillsAlignment },
    matchedSkills: matched,
    missingSkills: missing,
  };
}
