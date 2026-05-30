import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { resolveCandidateYears } from "@/scoring/experience-years";

export interface DealBreakerResult {
  triggered: string[];
  capScore: boolean;
}

const PHD_PATTERNS = /\b(ph\.?d|doctorate)\b/i;
const AUTH_PATTERNS =
  /\b(us\s+citizen|us\s+work\s+authorization|authorized\s+to\s+work\s+in\s+(the\s+)?u\.?s\.?|must\s+be\s+eligible\s+to\s+work)\b/i;
const YEARS_SKILL_PATTERN =
  /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?(.+?)(?:\s+required|\s+must|$)/i;

function hasPhd(resume: ResumeSchemaType): boolean {
  return resume.education.some((e) => {
    const deg = `${e.degree} ${e.field}`.toLowerCase();
    return /\b(ph\.?d|doctorate)\b/.test(deg);
  });
}

function findResumeSkill(resume: ResumeSchemaType, skillName: string) {
  const target = SkillCanonicalizer.normalizeForMatch(skillName);
  return resume.skills.find(
    (s) => SkillCanonicalizer.normalizeForMatch(s.skillName) === target
  );
}

export class DealBreakerDetector {
  static check(resume: ResumeSchemaType, jd: JobSchemaType): DealBreakerResult {
    const triggered: string[] = [];

    for (const rule of jd.dealbreakers) {
      const lower = rule.toLowerCase();

      if (PHD_PATTERNS.test(rule) && !hasPhd(resume)) {
        triggered.push(`Dealbreaker: ${rule} — candidate has no PhD`);
        continue;
      }

      if (AUTH_PATTERNS.test(rule)) {
        const loc = (resume.location ?? "").toLowerCase();
        const needsReview =
          !loc.includes("united states") &&
          !loc.includes("usa") &&
          !loc.includes("u.s.");
        if (needsReview) {
          triggered.push(
            `Dealbreaker: ${rule} — work authorization not confirmed on resume`
          );
        }
        continue;
      }

      const yearsMatch = rule.match(YEARS_SKILL_PATTERN);
      if (yearsMatch) {
        const minYears = parseInt(yearsMatch[1], 10);
        const skillPart = yearsMatch[2].trim();
        const skill = findResumeSkill(resume, skillPart);
        const years = skill?.yearsWithSkill ?? 0;
        if (!skill || years < minYears) {
          triggered.push(
            `Dealbreaker: ${rule} — ${skillPart} experience (${years}y) below ${minYears}y required`
          );
        }
        continue;
      }

      if (lower.includes("phd") && !hasPhd(resume)) {
        triggered.push(`Dealbreaker: ${rule} — candidate has no PhD`);
      }
    }

    if (jd.educationRequirement === "PHD" && !hasPhd(resume)) {
      triggered.push("Dealbreaker: PhD required — candidate has no PhD");
    }

    // Missing must-have skills are surfaced for the UI but do not cap the score —
    // listings often mark the entire tech stack as required, which would pin every score at 30.
    for (const req of jd.requiredSkills.filter((s) => s.isMustHave)) {
      const skill = findResumeSkill(resume, req.skillName);
      if (!skill) {
        triggered.push(`Gap: missing required skill ${req.skillName}`);
        continue;
      }
      if (req.minLevel > 1 && skill.yearsWithSkill != null) {
        const escapedSkill = req.skillName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const yearsMatch = jd.dealbreakers
          .join(" ")
          .match(new RegExp(`(\\d+)\\+?\\s*years?.*${escapedSkill}`, "i"));
        if (yearsMatch) {
          const minYears = parseInt(yearsMatch[1], 10);
          if (skill.yearsWithSkill < minYears) {
            triggered.push(
              `Dealbreaker: ${minYears}+ years ${req.skillName} required — candidate has ${skill.yearsWithSkill}y`
            );
          }
        }
      }
    }

    if (jd.experienceLevel) {
      const level = jd.experienceLevel.toLowerCase();
      const years = resolveCandidateYears(resume).years;
      const levelYearsMatch = level.match(/(\d+)\s*\+?\s*years?/i);
      const minFromLevel = levelYearsMatch
        ? parseInt(levelYearsMatch[1], 10)
        : null;
      const minRequired =
        jd.minYearsExperience && jd.minYearsExperience > 0
          ? jd.minYearsExperience
          : minFromLevel;

      if (minRequired != null && years < minRequired) {
        triggered.push(
          `Dealbreaker: insufficient experience (${years}y) — role requires ${minRequired}+ years`
        );
      } else if (minRequired == null) {
        if (level.includes("senior") && years < 5) {
          triggered.push("Insufficient seniority for role (under 5 years)");
        }
        if (level.includes("lead") && years < 7) {
          triggered.push("Insufficient leadership experience (under 7 years)");
        }
      }
    }

    const unique = [...new Set(triggered)];
    const capScore = unique.some((t) => /^Dealbreaker:/i.test(t));
    return {
      triggered: unique,
      capScore,
    };
  }
}

/** @deprecated Use DealBreakerDetector.check */
export function detectDealbreakers(
  resume: ResumeSchemaType,
  job: JobSchemaType
): string[] {
  return DealBreakerDetector.check(resume, job).triggered;
}
