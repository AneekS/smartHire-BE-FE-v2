import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

const EDUCATION_RANK: Record<string, number> = {
  NONE: 0,
  HIGH_SCHOOL: 1,
  BACHELORS: 2,
  MASTERS: 3,
  PHD: 4,
};

const TIER1_KEYWORDS = [
  "mit",
  "stanford",
  "harvard",
  "berkeley",
  "caltech",
  "oxford",
  "cambridge",
  "wharton",
  "ivy",
];

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

function fieldRelevance(resume: ResumeSchemaType, jd: JobSchemaType): number {
  const jdBlob = [
    jd.title,
    jd.description ?? "",
    ...jd.requiredSkills.map((s) => s.skillName),
  ]
    .join(" ")
    .toLowerCase();

  let best = 0.5;
  for (const e of resume.education) {
    const field = (e.field ?? "").toLowerCase();
    if (!field) continue;
    if (jdBlob.includes(field)) best = 1;
    else if (field.split(/\W+/).some((w) => w.length > 3 && jdBlob.includes(w))) best = 0.8;
  }
  return best;
}

function institutionTierBonus(resume: ResumeSchemaType): number {
  for (const e of resume.education) {
    const inst = (e.institution ?? "").toLowerCase();
    if (TIER1_KEYWORDS.some((k) => inst.includes(k))) return 5;
  }
  return 0;
}

export function scoreEducationMatch(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const req = jd.educationRequirement ?? "NONE";
  const candidate = educationRankFromResume(resume);
  const required = EDUCATION_RANK[req] ?? 0;

  if (required === 0) return { score: 80, reason: "No education requirement" };

  let base: number;
  if (candidate >= required) base = 100;
  else if (candidate === required - 1) base = 65;
  else base = 35;

  const relevance = fieldRelevance(resume, jd);
  const tierBonus = institutionTierBonus(resume);
  const score = Math.min(100, Math.round(base * relevance + tierBonus));

  return {
    score,
    reason:
      candidate >= required
        ? `Meets ${req} requirement with field relevance`
        : `Below ${req} requirement`,
  };
}
