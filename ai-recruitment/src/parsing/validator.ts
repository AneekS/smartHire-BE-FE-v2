import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";

const SENIORITY_YEAR_RANGES: Record<string, [number, number]> = {
  L1: [0, 1],
  L2: [1, 2],
  L3: [2, 5],
  L4: [5, 8],
  L5: [8, 12],
  L6: [12, 99],
};

const SKILL_DOMAIN_MAP: Record<string, ExtractionResumeSchemaType["skills"][0]["domain"]> = {
  react: "FRONTEND",
  vue: "FRONTEND",
  angular: "FRONTEND",
  "next.js": "FRONTEND",
  svelte: "FRONTEND",
  html: "FRONTEND",
  css: "FRONTEND",
  tailwind: "FRONTEND",
  "node.js": "BACKEND",
  node: "BACKEND",
  python: "BACKEND",
  java: "BACKEND",
  go: "BACKEND",
  rust: "BACKEND",
  "c#": "BACKEND",
  ".net": "BACKEND",
  express: "BACKEND",
  fastapi: "BACKEND",
  django: "BACKEND",
  rails: "BACKEND",
  typescript: "BACKEND",
  postgresql: "DATABASES",
  mysql: "DATABASES",
  mongodb: "DATABASES",
  redis: "DATABASES",
  dynamodb: "DATABASES",
  elasticsearch: "DATABASES",
  docker: "DEVOPS",
  kubernetes: "DEVOPS",
  terraform: "DEVOPS",
  jenkins: "DEVOPS",
  "github actions": "DEVOPS",
  ansible: "DEVOPS",
  tensorflow: "DATA_AI",
  pytorch: "DATA_AI",
  "scikit-learn": "DATA_AI",
  ml: "DATA_AI",
  llm: "DATA_AI",
  "machine learning": "DATA_AI",
  aws: "CLOUD",
  azure: "CLOUD",
  gcp: "CLOUD",
  s3: "CLOUD",
  lambda: "CLOUD",
  ios: "MOBILE",
  android: "MOBILE",
  flutter: "MOBILE",
  "react native": "MOBILE",
};

export interface CrossFieldValidationResult {
  resume: ExtractionResumeSchemaType;
  issues: string[];
  flags: string[];
  parseConfidence: number;
}

export class CrossFieldValidator {
  static validate(schema: ExtractionResumeSchemaType): CrossFieldValidationResult {
    const issues: string[] = [];
    const flags: string[] = [];
    const resume = structuredClone(schema) as ExtractionResumeSchemaType;

    const band = resume.seniorityBand as keyof typeof SENIORITY_YEAR_RANGES;
    const years = resume.yearsOfExperience;
    const [lo, hi] = SENIORITY_YEAR_RANGES[band] ?? [0, 99];

    if (!resume.personalInfo.email?.trim() && !resume.personalInfo.phone?.trim()) {
      issues.push("Missing contact: no email or phone");
      flags.push("MISSING_CONTACT");
    }

    if (!resume.experience.length) {
      issues.push("Empty experience section");
      flags.push("EMPTY_EXPERIENCE");
    }

    if (years < lo - 1 || years > hi + 1) {
      const correctedBand =
        Object.entries(SENIORITY_YEAR_RANGES).find(
          ([, [low, high]]) => years >= low && years <= high
        )?.[0] ?? "L3";
      issues.push(
        `Seniority mismatch: ${band} claims ${years}yr — corrected to ${correctedBand}`
      );
      flags.push("SENIORITY_MISMATCH");
      resume.seniorityBand = correctedBand as ExtractionResumeSchemaType["seniorityBand"];
      if (resume.field_confidence.seniorityBand !== undefined) {
        resume.field_confidence.seniorityBand = Math.max(
          0,
          resume.field_confidence.seniorityBand - 0.2
        );
      }
    }

    for (const exp of resume.experience) {
      if (!exp.startDate) continue;
      const start = new Date(`${exp.startDate}-01`);
      const end = exp.isCurrent
        ? new Date()
        : exp.endDate
          ? new Date(`${exp.endDate}-01`)
          : null;
      if (!end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      const computed = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );

      if (exp.durationMonths !== null) {
        const delta = Math.abs(computed - exp.durationMonths) / Math.max(computed, 1);
        if (delta > 0.2) {
          issues.push(
            `Duration corrected: ${exp.company} ${exp.durationMonths}mo → ${computed}mo`
          );
          exp.durationMonths = computed;
        }
      } else {
        exp.durationMonths = computed;
      }
    }

    for (const skill of resume.skills) {
      const key = skill.name.toLowerCase().trim();
      const mapped = SKILL_DOMAIN_MAP[key];
      if (mapped && mapped !== skill.domain) {
        issues.push(`Skill domain corrected: ${skill.name} ${skill.domain} → ${mapped}`);
        skill.domain = mapped;
      }
    }

    for (const exp of resume.experience) {
      if (exp.isCurrent && exp.endDate !== null) {
        issues.push(`isCurrent=true but endDate set (${exp.company}) — cleared endDate`);
        exp.endDate = null;
      }
    }

    const sumMonths = resume.experience.reduce(
      (acc, e) => acc + (e.durationMonths ?? 0),
      0
    );
    const derivedYears = sumMonths / 12;
    const delta = Math.abs(derivedYears - years);
    if (delta > 2) {
      flags.push("TOTAL_EXPERIENCE_DELTA");
      issues.push(
        `Total experience delta: stated ${years}yr vs computed ${derivedYears.toFixed(1)}yr (${delta.toFixed(1)}yr gap)`
      );
    }

    const confidenceValues = Object.values(resume.field_confidence).filter(
      (v) => typeof v === "number"
    );
    const baseConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
        : 0.5;

    const issuesPenalty = Math.min(issues.length * 0.02, 0.2);
    const parseConfidence = Math.max(0, Math.min(1, baseConfidence - issuesPenalty));

    return { resume, issues, flags, parseConfidence };
  }
}

/** @deprecated Use CrossFieldValidator for extraction schema */
export interface ValidationResult {
  resume: import("@/models/resume.schema").ResumeSchemaType;
  parseConfidence: number;
  field_confidence: Record<string, number>;
  lowConfidenceFields: string[];
  issues: string[];
}

/** @deprecated Legacy validator for old resume schema — use CrossFieldValidator */
export function validateResume(
  resume: import("@/models/resume.schema").ResumeSchemaType
): ValidationResult {
  const field_confidence: Record<string, number> = { ...resume.field_confidence };
  const issues: string[] = [];

  if (!resume.fullName?.trim()) {
    field_confidence.fullName = Math.min(field_confidence.fullName ?? 0, 0.3);
    issues.push("Missing fullName");
  }

  const values = Object.values(field_confidence).filter((v) => typeof v === "number");
  const avg =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : resume.parseConfidence;
  const parseConfidence = Math.min(1, Math.max(0, avg));
  const lowConfidenceFields = Object.entries(field_confidence)
    .filter(([, v]) => v < 0.7)
    .map(([k]) => k);

  return {
    resume: { ...resume, parseConfidence, field_confidence },
    parseConfidence,
    field_confidence,
    lowConfidenceFields,
    issues,
  };
}
