import { z } from "zod";
import { insforge } from "@/lib/insforge";

const parsedSchema = z.object({
    contactInfo: z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
        location: z.string(),
        linkedin: z.string(),
        github: z.string(),
        website: z.string()
    }),
    summary: z.string(),
    experience: z.array(z.object({
        id: z.string(),
        title: z.string(),
        company: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        location: z.string(),
        bullets: z.array(z.object({
            id: z.string(),
            text: z.string()
        }))
    })),
    education: z.array(z.object({
        id: z.string(),
        degree: z.string(),
        institution: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        gpa: z.string(),
        location: z.string()
    })),
    skills: z.array(z.object({
        id: z.string(),
        name: z.string(),
        category: z.string()
    })),
    projects: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        techStack: z.array(z.string()),
        bullets: z.array(z.object({
            id: z.string(),
            text: z.string()
        })),
        liveUrl: z.string(),
        repoUrl: z.string()
    })),
    certifications: z.array(z.object({
        id: z.string(),
        name: z.string(),
        issuer: z.string(),
        date: z.string()
    }))
});

export type ParsedResume = z.infer<typeof parsedSchema>;

export class ParserService {
    async parse(rawText: string): Promise<ParsedResume> {
        const systemPrompt = `
You are an expert resume parser. Extract ALL information from the resume text provided.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "contactInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": "" },
  "summary": "full summary text",
  "experience": [{ "id": "uuid", "title": "", "company": "", "startDate": "", "endDate": "", "location": "", "bullets": [{"id":"uuid","text":"..."}] }],
  "education": [{ "id": "uuid", "degree": "", "institution": "", "startDate": "", "endDate": "", "gpa": "", "location": "" }],
  "skills": [{ "id": "uuid", "name": "", "category": "" }],
  "projects": [{ "id": "uuid", "name": "", "description": "", "techStack": [], "bullets": [{"id":"uuid","text":"..."}], "liveUrl": "", "repoUrl": "" }],
  "certifications": [{ "id": "uuid", "name": "", "issuer": "", "date": "" }]
}
Extract EVERYTHING. Do not summarize or skip any content. 
Assign a unique uuid to every item that has an id field.
`;

        try {
            const completion = await insforge.ai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Parse this resume:\n\n${rawText}` }
                ]
            });

            let content = completion.choices[0].message.content || "{}";
            // Strip possible markdown wrapping
            content = content.replace(/^```(json)?\n/, '').replace(/\n```$/, '').trim();

            const object = JSON.parse(content);
            return parsedSchema.parse(object);
        } catch (e) {
            console.error("AI parse error:", e);
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
      "section": "contactInfo" | "experience" | "summary" | "education" | "projects",
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
                    { role: "user", content: `Resume JSON to improve:\n${JSON.stringify(parsed, null, 2)}` }
                ]
            });

            let content = completion.choices[0].message.content || '{"improvements": []}';
            content = content.replace(/^```(json)?\n/, '').replace(/\n```$/, '').trim();

            const object = JSON.parse(content);
            return object.improvements || [];
        } catch (e) {
            console.error("Improvement generation error:", e);
            return []; // Fallback empty
        }
    }
}
