import { insforge } from "@/lib/insforge";
import { requireAuth } from "@/lib/insforge-server";

export class OptimizerService {
  async generateSuggestions(
    resumeId: string,
    candidateId: string,
    jobId?: string
  ): Promise<Record<string, unknown>[]> {
    const { client } = await requireAuth();

    const { data: parsed } = await client.database
      .from("parsed_resumes")
      .select("*")
      .eq("resume_id", resumeId)
      .maybeSingle();

    if (!parsed) throw new Error("Parsed resume not found");

    let jobContext = "";
    if (jobId) {
      const { data: job } = await client.database
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();
      if (job) {
        jobContext = `TARGET JOB: ${job.title} at ${job.company_name}\nRequired: ${(job.required_skills ?? []).join(", ")}`;
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

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const suggestions = Array.isArray(result) ? result : [];

    for (const s of suggestions) {
      await client.database.from("resume_improvements").insert({
        resume_id: resumeId,
        candidate_id: candidateId,
        job_id: jobId ?? null,
        type: s.type ?? "BULLET_REWRITE",
        severity: s.severity ?? "MEDIUM",
        section: s.section ?? null,
        original_text: s.original_text ?? null,
        suggested_text: s.suggested_text ?? null,
        explanation: s.explanation ?? null,
      });
    }

    return suggestions;
  }
}
