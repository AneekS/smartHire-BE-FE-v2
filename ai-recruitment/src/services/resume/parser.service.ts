import { z } from "zod";
import { insforge } from "@/lib/insforge";

const EducationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  year: z.number().optional(),
  cgpa: z.number().optional(),
  is_tier1: z.boolean().default(false),
});

const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  duration_months: z.number(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().default(false),
  description: z.string(),
  skills_used: z.array(z.string()),
  impact_score: z.number().min(0).max(10).default(5),
});

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech_stack: z.array(z.string()),
  github_url: z.string().optional(),
  live_url: z.string().optional(),
  complexity_score: z.number().min(0).max(10).default(5),
});

const ParsedResumeSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  github_url: z.string().optional(),
  portfolio_url: z.string().optional(),
  professional_summary: z.string().optional(),
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  databases: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  cloud_platforms: z.array(z.string()).default([]),
  soft_skills: z.array(z.string()).default([]),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(z.unknown()).default([]),
  achievements: z.array(z.unknown()).default([]),
  has_internship: z.boolean().default(false),
  has_open_source: z.boolean().default(false),
  confidence_score: z.number().min(0).max(1),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

const PARSE_SYSTEM_PROMPT = `
You are an expert resume parser for a recruitment platform focused on Indian
engineering freshers and early-career professionals.

Extract ALL information from the resume text and return ONLY valid JSON.
Be thorough — do not skip any section. Use null for missing fields, never guess.

IMPORTANT RULES:
- Extract tech skills into correct categories (languages vs frameworks vs tools)
- For Indian universities, set is_tier1: true for IITs, NITs, IIITs, BITS
- Calculate duration_months accurately from dates
- impact_score: rate 1-10 how impactful each experience bullet sounds
- complexity_score: rate 1-10 how technically complex each project is
- confidence_score: your overall confidence in the extraction (0-1)
- has_open_source: true if GitHub contributions or OSS projects mentioned
- has_internship: true if any internship experience found

Return ONLY the JSON object, no markdown, no explanation.
`;

export class ParserService {
  async parse(
    rawText: string,
    resumeId: string,
    candidateId: string
  ): Promise<ParsedResume> {
    const client = await (await import("@/lib/insforge-server")).getAuthenticatedClient();
    if (!client) throw new Error("Unauthorized");

    await client.database
      .from("resumes")
      .update({ parse_status: "PROCESSING" })
      .eq("id", resumeId);

    try {
      const parsed = await this.callAI(rawText);
      const validated = ParsedResumeSchema.parse(parsed);
      const metrics = this.computeMetrics(validated, rawText);

      const insertData = {
        resume_id: resumeId,
        candidate_id: candidateId,
        name: validated.name,
        email: validated.email ?? null,
        phone: validated.phone ?? null,
        linkedin_url: validated.linkedin_url ?? null,
        github_url: validated.github_url ?? null,
        portfolio_url: validated.portfolio_url ?? null,
        professional_summary: validated.professional_summary ?? null,
        languages: validated.languages,
        frameworks: validated.frameworks,
        databases: validated.databases,
        tools: validated.tools,
        cloud_platforms: validated.cloud_platforms,
        soft_skills: validated.soft_skills,
        education: validated.education as unknown[],
        experience: validated.experience as unknown[],
        projects: validated.projects as unknown[],
        certifications: validated.certifications,
        achievements: validated.achievements,
        has_internship: validated.has_internship,
        has_open_source: validated.has_open_source,
        confidence_score: validated.confidence_score,
        total_experience_months: metrics.total_experience_months,
        skills_count: metrics.skills_count,
        project_count: metrics.project_count,
        quantification_score: metrics.quantification_score,
        model_used: "openai/gpt-4o-mini",
        parse_version: "v1",
      };

      const { data: existing } = await client.database
        .from("parsed_resumes")
        .select("id")
        .eq("resume_id", resumeId)
        .maybeSingle();

      if (existing) {
        await client.database
          .from("parsed_resumes")
          .update(insertData)
          .eq("resume_id", resumeId);
      } else {
        await client.database.from("parsed_resumes").insert(insertData);
      }

      await client.database
        .from("resumes")
        .update({
          parse_status: "DONE",
          raw_text: rawText,
          parsed_at: new Date().toISOString(),
        })
        .eq("id", resumeId);

      return validated;
    } catch (error) {
      await client.database
        .from("resumes")
        .update({ parse_status: "FAILED" })
        .eq("id", resumeId);
      throw error;
    }
  }

  private async callAI(rawText: string, retries = 3): Promise<unknown> {
    const text = rawText.length > 24000 ? rawText.substring(0, 24000) : rawText;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const completion = await insforge.ai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: PARSE_SYSTEM_PROMPT },
            { role: "user", content: `Parse this resume:\n\n${text}` },
          ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty response from AI");
        return JSON.parse(content);
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    throw new Error("Parse failed");
  }

  private computeMetrics(
    parsed: ParsedResume,
    rawText: string
  ): {
    total_experience_months: number;
    skills_count: number;
    project_count: number;
    quantification_score: number;
  } {
    const totalExperienceMonths = parsed.experience.reduce(
      (sum, exp) => sum + (exp.duration_months || 0),
      0
    );

    const allSkills = [
      ...parsed.languages,
      ...parsed.frameworks,
      ...parsed.databases,
      ...parsed.tools,
      ...parsed.cloud_platforms,
    ];

    const allBullets = parsed.experience.map((e) => e.description).join(" ");
    const numberMatches = (allBullets.match(/\d+/g) || []).length;
    const sentenceCount = (allBullets.match(/\./g) || []).length + 1;
    const quantificationScore = Math.min(numberMatches / sentenceCount, 1);

    return {
      total_experience_months: totalExperienceMonths,
      skills_count: allSkills.length,
      project_count: parsed.projects.length,
      quantification_score: quantificationScore,
    };
  }
}
