import { z } from "zod";
import { insforge } from "@/lib/insforge";

// Lenient schema so we never drop sections (e.g. projects) due to strict validation.
// All optional with defaults; AI can omit fields and we still get [] or "".
const contactInfoSchema = z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    linkedin: z.string().optional().default(""),
    github: z.string().optional().default(""),
    website: z.string().optional().default(""),
}).default({});

const bulletSchema = z.object({
    id: z.string().default(""),
    text: z.string().default(""),
});

const experienceSchema = z.array(z.object({
    id: z.string().default(""),
    title: z.string().default(""),
    company: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().default(""),
    location: z.string().optional().default(""),
    bullets: z.array(bulletSchema).default([]),
})).default([]);

const educationSchema = z.array(z.object({
    id: z.string().default(""),
    degree: z.string().default(""),
    institution: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().default(""),
    gpa: z.string().optional().default(""),
    location: z.string().optional().default(""),
})).default([]);

const skillSchema = z.object({
    id: z.string().default(""),
    name: z.string().default(""),
    category: z.string().optional().default(""),
});

const projectSchema = z.object({
    id: z.string().default(""),
    name: z.string().default(""),
    description: z.string().optional().default(""),
    techStack: z.array(z.string()).default([]),
    bullets: z.array(bulletSchema).default([]),
    liveUrl: z.string().optional().default(""),
    repoUrl: z.string().optional().default(""),
    startDate: z.string().optional().default(""),
    endDate: z.string().optional().default(""),
});

const certificationSchema = z.object({
    id: z.string().default(""),
    name: z.string().default(""),
    issuer: z.string().default(""),
    date: z.string().default(""),
});

const parsedSchema = z.object({
    contactInfo: contactInfoSchema,
    summary: z.string().default(""),
    experience: experienceSchema,
    education: educationSchema,
    skills: z.array(skillSchema).default([]),
    projects: z.array(projectSchema).default([]),
    certifications: z.array(certificationSchema).default([]),
});

export type ParsedResume = z.infer<typeof parsedSchema>;

const SYSTEM_PROMPT = `You are an expert resume parser. Extract EVERY section from the resume text provided from start to finish.
CRITICAL: Read the ENTIRE document. Do NOT stop at Experience or Education. Always scan for:
- PROJECTS / Personal Projects / Side Projects (extract every project with name, description, tech stack, bullets, links, dates)
- Certifications, Achievements, Publications, Volunteering, Languages
If a section is not present, return an empty array [] for it.

Return ONLY valid JSON matching this structure — no markdown, no backticks, no explanation:
{
  "contactInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": "" },
  "summary": "full summary text",
  "experience": [{ "id": "exp_1", "title": "", "company": "", "startDate": "", "endDate": "", "location": "", "bullets": [{"id":"b1","text":"..."}] }],
  "education": [{ "id": "edu_1", "degree": "", "institution": "", "startDate": "", "endDate": "", "gpa": "", "location": "" }],
  "skills": [{ "id": "s1", "name": "", "category": "" }],
  "projects": [{ "id": "proj_1", "name": "", "description": "", "techStack": [], "bullets": [{"id":"b1","text":"..."}], "liveUrl": "", "repoUrl": "", "startDate": "", "endDate": "" }],
  "certifications": [{ "id": "c1", "name": "", "issuer": "", "date": "" }]
}

RULES:
- Extract EVERY project listed. The projects array is REQUIRED — scan the full resume for any Projects section.
- Do not summarize or truncate bullet points — copy them verbatim.
- Assign unique id strings (e.g. exp_1, proj_1, edu_1).
- Use empty string "" or [] when a field is missing.`;

export class ParserService {
    async parse(rawText: string): Promise<ParsedResume> {
        const textToSend = rawText.trim();
        console.log("[ParserService] Before OpenAI call:", {
            textLength: textToSend.length,
            previewEnd: textToSend.length > 600 ? textToSend.slice(-400).replace(/\n/g, " ") : "(short)",
        });

        try {
            const completion = await insforge.ai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0,
                max_tokens: 4096,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Extract ALL sections from this resume:\n\n${textToSend}` },
                ],
            });

            const usage = (completion as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
            console.log("[ParserService] Token usage:", usage);

            let content = completion.choices[0].message.content ?? "{}";
            console.log("[ParserService] Raw response length:", content.length, "preview:", content.slice(0, 300));

            content = content.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "").trim();
            const object = JSON.parse(content) as Record<string, unknown>;

            const parsed = parsedSchema.parse({
                contactInfo: object.contactInfo ?? {},
                summary: object.summary ?? "",
                experience: object.experience ?? [],
                education: object.education ?? [],
                skills: object.skills ?? [],
                projects: object.projects ?? [],
                certifications: object.certifications ?? [],
            });

            console.log("[ParserService] After parse — projects count:", parsed.projects?.length ?? 0, "projects:", parsed.projects);
            return parsed;
        } catch (e) {
            console.error("[ParserService] AI parse error:", e);
            throw new Error(`Failed to parse resume: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    async generateImprovements(parsed: ParsedResume): Promise<unknown[]> {
        const sys = `
You are an expert tech recruiter and ATS optimization tool. Analyze the provided structured resume JSON and generate 2-4 critical or important improvements to improve impact, score, and keywords.
Follow these exact instructions:
- Return ONLY valid JSON matching this EXACT schema:
{
  "improvements": [
    {
      "id": "uuid",
      "severity": "critical" | "important" | "suggestion",
      "section": "contactInfo" | "experience" | "summary" | "education" | "projects" | "skills",
      "fieldPath": "exact string, e.g. experience.0.bullets.2",
      "title": "Short title",
      "description": "Explanation",
      "originalText": "Must match exact text",
      "suggestedText": "ATS optimized text with metrics",
      "impact": "High / Medium"
    }
  ]
}
- 'originalText' MUST match the field's text perfectly.
Return ONLY valid JSON. Avoid markdown code blocks.
`;

        try {
            const completion = await insforge.ai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: sys },
                    { role: "user", content: `Resume JSON to improve:\n${JSON.stringify(parsed, null, 2)}` },
                ],
            });

            let content = completion.choices[0].message.content ?? '{"improvements": []}';
            content = content.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "").trim();

            const object = JSON.parse(content) as { improvements?: unknown[] };
            return object.improvements ?? [];
        } catch (e) {
            console.error("Improvement generation error:", e);
            return [];
        }
    }
}
