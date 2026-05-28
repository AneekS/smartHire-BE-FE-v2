import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI();

export class OptimizerService {
  async generateSuggestions(
    resumeVersionId: string,
    _candidateId: string,
    jobId?: string
  ): Promise<Record<string, unknown>[]> {
    const parsedResume = await prisma.parsedResume.findUnique({
      where: { resumeVersionId },
    });

    if (!parsedResume) throw new Error("Parsed resume not found");

    const parsed = parsedResume.parsedData as Record<string, unknown>;

    let jobContext = "";
    if (jobId) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });
      if (job) {
        jobContext = `TARGET JOB: ${job.title}\nRequired: ${(job.requiredSkills ?? []).join(", ")}`;
      }
    }

    const prompt = `You are a resume optimization expert for Indian tech freshers/junior devs.
Analyze this parsed resume data and generate actionable improvement suggestions.
${jobContext}

RESUME DATA: ${JSON.stringify(parsed, null, 2)}

Generate suggestions in this EXACT JSON array format:
[{
  "type": "KEYWORD_MISSING|BULLET_REWRITE|SECTION_MISSING|FORMAT_ISSUE|SKILL_ADD|QUANTIFY_IMPACT|SUMMARY_IMPROVE|LENGTH_ISSUE",
  "severity": "HIGH|MEDIUM|LOW",
  "section": "string (which resume section)",
  "original_text": "string or null",
  "suggested_text": "string (the improved version)",
  "explanation": "string (why this matters for ATS)"
}]

Focus on:
1. Missing keywords from job description
2. Bullets that don't quantify impact (add numbers, %)
3. Missing sections (summary, GitHub, LinkedIn)
4. Weak action verbs
5. Skills that should be added or restructured

Return ONLY the JSON array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const suggestions = Array.isArray(result) ? result : [];

    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { improvements: JSON.stringify(suggestions) },
    });

    return suggestions;
  }
}
