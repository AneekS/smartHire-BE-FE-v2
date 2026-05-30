import { OnetSkillTaxonomy } from "@/scoring/taxonomy/OnetSkillTaxonomy";
import { applySkillRecencyDecay } from "@/scoring/engine/RecencyDecay";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { ComponentDetail } from "@/scoring/types";

function findResumeSkill(resume: ResumeSchemaType, skillName: string) {
  const target = OnetSkillTaxonomy.normalizeForMatch(skillName);
  return resume.skills.find(
    (s) => OnetSkillTaxonomy.normalizeForMatch(s.skillName) === target
  );
}

export function scoreSkillMatch(resume: ResumeSchemaType, jd: JobSchemaType): ComponentDetail {
  const required = jd.requiredSkills;
  if (!required.length) {
    return {
      score: 50,
      skillScoreReliable: false,
      reason: "No required skills specified in job listing — score set to neutral 50",
      matched: [],
      missing: [],
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];
  let total = 0;
  let mustHaveMissing = 0;
  const currentYear = new Date().getFullYear();

  for (const req of required) {
    const match = OnetSkillTaxonomy.findBestMatch(req.skillName);
    const canonical = match.canonical;
    const skill = findResumeSkill(resume, canonical) ?? findResumeSkill(resume, req.skillName);

    if (!skill) {
      missing.push(req.skillName);
      if (req.isMustHave) mustHaveMissing++;
      continue;
    }

    matched.push(req.skillName);
    const levelRatio = Math.min(skill.level / req.minLevel, 1);
    const levelGap = Math.max(0, req.minLevel - skill.level);
    const levelPenalty = levelGap > 0 ? Math.max(0.5, 1 - levelGap * 0.15) : 1;
    const recency = applySkillRecencyDecay(skill.lastUsedYear, currentYear);
    total += Math.min(100, levelRatio * recency * levelPenalty * 100);
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
