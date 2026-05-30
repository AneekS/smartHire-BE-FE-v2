import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";

function isFallbackEnabled(): boolean {
  const v = process.env.SCORING_FALLBACK_LLM;
  return v === "true" || v === "1";
}

/**
 * Isolated GPT-4o-mini fallback for semantic score ONLY.
 * Never used for final ATS score computation.
 */
export async function semanticFallbackScore(
  resume: ResumeSchemaType,
  job: JobSchemaType
): Promise<number | null> {
  if (!isFallbackEnabled()) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const resumeSummary = [
    resume.summary,
    resume.currentTitle,
    ...resume.skills.map((s) => s.skillName),
    ...resume.experience.slice(0, 3).map((e) => `${e.title} at ${e.company}`),
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 2000);

  const jobSummary = [
    job.title,
    job.description,
    ...job.requiredSkills.map((s) => s.skillName),
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 2000);

  try {
    const openai = createOpenAI({ apiKey });
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Rate semantic alignment between resume and job on a 0-100 integer scale. Reply with ONLY the number.\n\nJob: ${jobSummary}\n\nResume: ${resumeSummary}`,
      maxOutputTokens: 8,
    });

    const parsed = parseInt(text.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
    return null;
  } catch {
    return null;
  }
}
