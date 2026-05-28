import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";
import { getRequiredSkillNames } from "@/models/job.schema";
import type { HybridHit } from "@/retrieval/hybrid";

export interface MatchContext {
  resume: ResumeSchemaType;
  job: JobSchemaType;
  resumeSummary: string;
  topChunks: HybridHit[];
  matchedSkills: string[];
  missingSkills: string[];
  dealbreakers: string[];
  promptContext: string;
}

const MAX_CONTEXT_CHARS = 8000;

export function assembleMatchContext(input: {
  resume: ResumeSchemaType;
  job: JobSchemaType;
  topChunks: HybridHit[];
  matchedSkills: string[];
  missingSkills: string[];
  dealbreakers: string[];
}): MatchContext {
  const resumeSummary = [
    input.resume.fullName,
    input.resume.currentTitle,
    input.resume.summary,
    `Skills: ${input.resume.skills.map((s) => s.skillName).join(", ")}`,
    `Experience: ${input.resume.experience.length} roles`,
  ]
    .filter(Boolean)
    .join(" | ");

  const chunkBlock = input.topChunks
    .map((c) => `[${c.section}] ${c.content}`)
    .join("\n---\n");

  const jobBlock = [
    `Title: ${input.job.title}`,
    `Required: ${getRequiredSkillNames(input.job).join(", ")}`,
    input.job.description?.slice(0, 2000),
  ]
    .filter(Boolean)
    .join("\n");

  let promptContext = [
    "## Candidate",
    resumeSummary,
    chunkBlock ? `\n## Relevant resume excerpts\n${chunkBlock}` : "",
    "\n## Job",
    jobBlock,
    `\n## Evidence`,
    `Matched skills: ${input.matchedSkills.join(", ") || "(none)"}`,
    `Missing skills: ${input.missingSkills.join(", ") || "(none)"}`,
    input.dealbreakers.length
      ? `Dealbreakers: ${input.dealbreakers.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (promptContext.length > MAX_CONTEXT_CHARS) {
    promptContext = promptContext.slice(0, MAX_CONTEXT_CHARS) + "\n...[truncated]";
  }

  return {
    resume: input.resume,
    job: input.job,
    resumeSummary,
    topChunks: input.topChunks,
    matchedSkills: input.matchedSkills,
    missingSkills: input.missingSkills,
    dealbreakers: input.dealbreakers,
    promptContext,
  };
}
