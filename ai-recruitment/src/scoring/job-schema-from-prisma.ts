import type { JobSkillRequirement, JobSchemaType } from "@/models/job.schema";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { jobSchemaFromText } from "@/scoring/jd-heuristic";

export type JobForScoring = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  requiredSkills: string[];
  industryProfile?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  seniorityBand?: string | null;
  jobSkills: Array<{ name: string; normalized: string; importance: number }>;
};

function clampLevel(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function buildDbRequiredSkills(
  job: JobForScoring,
  textExtracted: JobSkillRequirement[]
): JobSkillRequirement[] {
  const fromStrings = job.requiredSkills.map((skillName) => ({
    skillName,
    minLevel: 3,
    isMustHave: false,
  }));

  const fromJobSkills = job.jobSkills.map((row) => ({
    skillName: row.name,
    minLevel: clampLevel(row.importance),
    isMustHave: row.importance >= 4,
  }));

  const byKey = new Map<string, JobSkillRequirement>();

  for (const skill of textExtracted) {
    const key = SkillCanonicalizer.normalizeForMatch(skill.skillName);
    if (key && !byKey.has(key)) byKey.set(key, skill);
  }

  for (const skill of [...fromStrings, ...fromJobSkills]) {
    const key = SkillCanonicalizer.normalizeForMatch(skill.skillName);
    if (!key) continue;
    byKey.set(key, skill);
  }

  return [...byKey.values()];
}

export function jobSchemaFromPrismaJob(job: JobForScoring): JobSchemaType {
  const base = jobSchemaFromText({
    jobId: job.id,
    jdText: `${job.description}\n\n${job.requirements}\n\n${job.requiredSkills.join(", ")}`,
    jobTitle: job.title,
  });

  return {
    ...base,
    title: job.title || base.title,
    roleTitle: job.title || base.roleTitle,
    requiredSkills: buildDbRequiredSkills(job, base.requiredSkills),
    minYearsExperience:
      job.experienceMin != null ? job.experienceMin : (base.minYearsExperience ?? 0),
    maxYearsExperience:
      job.experienceMax != null ? job.experienceMax : base.maxYearsExperience,
    seniorityExpected: (job.seniorityBand ??
      base.seniorityExpected) as JobSchemaType["seniorityExpected"],
    industryDomain: (job.industryProfile ??
      base.industryDomain ??
      "GENERAL") as JobSchemaType["industryDomain"],
  };
}
