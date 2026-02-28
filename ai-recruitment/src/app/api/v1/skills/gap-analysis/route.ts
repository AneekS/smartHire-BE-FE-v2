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
      .order("parsed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!parsed) {
      return NextResponse.json(
        { error: "Upload and parse resume first" },
        { status: 400 }
      );
    }

    const prompt = `You are a career advisor for Indian engineering freshers.

CANDIDATE SKILLS: ${JSON.stringify({
      languages: parsed.languages,
      frameworks: parsed.frameworks,
      databases: parsed.databases,
      tools: parsed.tools,
      experience_months: parsed.total_experience_months,
    })}

TARGET ROLE: ${target_role}
MARKET: India tech industry (2024-2025)

Return ONLY this JSON:
{
  "readiness_score": number (0-100),
  "readiness_label": "Just Starting|Building Up|Almost Ready|Job Ready",
  "missing_skills": [{
    "skill": string,
    "priority": "HIGH|MEDIUM|LOW",
    "reason": string,
    "estimated_hours": number,
    "learning_resources": [{
      "type": "MOOC|VIDEO|DOCS|PRACTICE",
      "title": string,
      "url": string,
      "is_free": boolean
    }]
  }],
  "strong_skills": [string],
  "summary": string
}`;

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await client.database.from("skill_gaps").insert({
      candidate_id: candidateId,
      target_role,
      missing_skills: result.missing_skills ?? [],
      readiness_score: result.readiness_score ?? 0,
    });

    return NextResponse.json(result);
  });
}
