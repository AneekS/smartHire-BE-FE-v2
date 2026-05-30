import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

export function scoreProjectRelevance(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const jdTech = new Set(
    [
      ...jd.requiredSkills.map((s) => s.skillName.toLowerCase()),
      ...jd.keyResponsibilities.join(" ").toLowerCase().split(/\W+/),
    ].filter((t) => t.length > 2)
  );

  const blobs = resume.experience.map((e) =>
    [e.title, e.company, ...e.achievements.map((a) => a.description)].join(" ").toLowerCase()
  );

  if (!blobs.length) {
    return { score: 40, reason: "No experience entries for project-style relevance" };
  }

  let best = 0;
  let quantifiedBonus = 0;
  for (const blob of blobs) {
    const hits = [...jdTech].filter((t) => blob.includes(t)).length;
    const ratio = jdTech.size > 0 ? hits / jdTech.size : 0.5;
    const metricHits = (blob.match(/[%$]|\d+\s*(users|ms|sec|team|k|m)/gi) ?? []).length;
    quantifiedBonus = Math.max(quantifiedBonus, Math.min(15, metricHits * 5));
    best = Math.max(best, Math.round(ratio * 100));
  }

  const score = Math.min(100, best + quantifiedBonus);
  return {
    score,
    reason: `Experience/project alignment with JD responsibilities: ${score}/100`,
  };
}
