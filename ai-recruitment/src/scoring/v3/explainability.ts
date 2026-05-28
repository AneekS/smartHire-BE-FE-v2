import { ollamaChat, parseJsonFromModel } from "@/lib/ollama-client";
import type { JobScoreResult } from "@/scoring/v3/types";

const EXPLAIN_PROMPT = `You are an ATS coach. Given evidence about a candidate vs a job, write a brief explanation.
Do NOT mention numeric scores or percentages. Focus on skills, experience gaps, and actionable advice.
Return JSON: { "explanation": "...", "reasons": ["...", "..."] }`;

export async function generateExplainability(
  evidence: {
    jobTitle: string;
    industryDomain: string;
    matchedSkills: string[];
    missingSkills: string[];
    dealbreakers: string[];
    topStrengths: string[];
    topGaps: string[];
  }
): Promise<Partial<Pick<JobScoreResult, "explanation" | "reasons">>> {
  try {
    const content = await ollamaChat(EXPLAIN_PROMPT, JSON.stringify(evidence, null, 2));
    const obj = parseJsonFromModel(content) as { explanation?: string; reasons?: string[] };
    return {
      explanation: obj.explanation,
      reasons: obj.reasons ?? [],
    };
  } catch {
    return {
      explanation: `Strongest areas: ${evidence.topStrengths.join(", ") || "skills"}. Gaps: ${evidence.topGaps.join(", ") || "none noted"}.`,
      reasons: evidence.matchedSkills.slice(0, 3).map((s) => `Matched: ${s}`),
    };
  }
}
