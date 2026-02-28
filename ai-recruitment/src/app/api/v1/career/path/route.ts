import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { insforge } from "@/lib/insforge";
import { z } from "zod";

const BodySchema = z.object({ target_role: z.string().min(1) });

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const body = await req.json();
    const { target_role } = BodySchema.parse(body);

    const { client } = await requireAuth();

    const { data: parsed } = await client.database
      .from("parsed_resumes")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();

    const skills = parsed
      ? [
          ...(parsed.languages ?? []),
          ...(parsed.frameworks ?? []),
        ].join(", ")
      : "";
    const months = parsed?.total_experience_months ?? 0;

    const prompt = `Create a detailed multi-year career roadmap for an Indian tech professional.

CURRENT PROFILE:
- Skills: ${skills}
- Experience: ${months} months
- Is Fresher: ${months < 12}

TARGET: ${target_role}
MARKET: India (Bengaluru, Hyderabad, Pune, Mumbai, Delhi NCR)

Return ONLY this JSON:
{
  "stages": [{
    "level": "JUNIOR|MID|SENIOR|LEAD|ARCHITECT",
    "title": string,
    "timeline_months": number,
    "salary_range": { "min": number, "max": number, "currency": "INR" },
    "required_skills": [string],
    "optional_skills": [string],
    "demand_in_india": "HIGH|MEDIUM|LOW",
    "key_milestones": [string]
  }],
  "total_years": number,
  "market_insights": string,
  "top_hiring_cities": [string]
}`;

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await client.database.from("career_paths").insert({
      candidate_id: candidateId,
      target_role,
      stages: result.stages ?? [],
    });

    return NextResponse.json(result);
  });
}
