import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI();

const BodySchema = z.object({ target_role: z.string().min(1) });

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const body = await req.json();
    const { target_role } = BodySchema.parse(body);

    const resumeVersion = await prisma.resumeVersion.findFirst({
      where: {
        user: {
          OR: [
            { id: candidateId },
            { candidate: { id: candidateId } },
          ],
        },
        status: "ACTIVE",
      },
      include: { parsedResume: true },
      orderBy: { createdAt: "desc" },
    });

    let skills = "";
    let months = 0;

    if (resumeVersion?.parsedResume) {
      const parsed = resumeVersion.parsedResume.parsedData as Record<string, unknown>;
      skills = [
        ...((parsed.languages as string[]) ?? []),
        ...((parsed.frameworks as string[]) ?? []),
      ].join(", ");
      months = (parsed.total_experience_months as number) ?? 0;
    } else if (resumeVersion?.parsedContent) {
      const parsed = JSON.parse(resumeVersion.parsedContent) as Record<string, unknown>;
      const allSkills = (parsed.skills as { name?: string }[]) ?? [];
      skills = allSkills.map((s) => s.name ?? "").filter(Boolean).join(", ");
    }

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { id: candidateId },
          { userId: candidateId },
        ],
      },
      include: { profile: true },
    });

    if (candidate?.profile) {
      const stageRoles = ((result.stages ?? []) as { title?: string }[]).map(
        (s) => s.title ?? target_role
      );
      await prisma.careerPath.upsert({
        where: { profileId: candidate.profile.id },
        create: {
          profileId: candidate.profile.id,
          suggestedRoles: stageRoles.length > 0 ? stageRoles : [target_role],
          readinessPercent: months > 0 ? Math.min(months / 12, 1) * 100 : 0,
        },
        update: {
          suggestedRoles: stageRoles.length > 0 ? stageRoles : [target_role],
          readinessPercent: months > 0 ? Math.min(months / 12, 1) * 100 : 0,
        },
      });
    }

    return NextResponse.json(result);
  });
}
