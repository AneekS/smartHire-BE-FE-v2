import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

const ACTION_VERBS = [
  "built",
  "led",
  "designed",
  "implemented",
  "delivered",
  "optimized",
  "reduced",
  "increased",
  "managed",
  "architected",
  "automated",
  "scaled",
];

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

  const achievementText = resume.experience
    .flatMap((e) => e.achievements.map((a) => a.description))
    .join(" ")
    .toLowerCase();

  const quantified = resume.experience.reduce(
    (n, e) =>
      n +
      e.achievements.filter((a) => /[%$]|\d+\s*(users|ms|sec|team)/i.test(a.description)).length,
    0
  );
  score += Math.min(15, quantified * 4);

  const verbHits = ACTION_VERBS.filter((v) => achievementText.includes(v)).length;
  score += Math.min(10, verbHits * 2);

  if (parseConfidence != null) {
    score = Math.round(score * 0.7 + parseConfidence * 100 * 0.3);
  }

  return {
    score: Math.min(100, score),
    reason: "Resume completeness, action verbs, and quantified achievements",
  };
}
