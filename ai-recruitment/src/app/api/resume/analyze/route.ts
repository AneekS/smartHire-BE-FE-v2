import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI();

const bodySchema = z.object({
  resumeVersionId: z.string(),
  rawText: z.string().min(100),
  roleTarget: z.string().optional(),
});

const suggestionSchema = z.object({
  type: z.enum(["CRITICAL", "IMPROVEMENT", "OPTIMIZATION"]),
  section: z.string(),
  title: z.string(),
  description: z.string(),
});

const analysisSchema = z.object({
  atsScore: z.number(),
  suggestions: z.array(suggestionSchema),
});

export async function POST(req: Request) {
  try {
    const { dbUser } = await withAuth();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }

    const { resumeVersionId, rawText, roleTarget } = parsed.data;

    const version = await prisma.resumeVersion.findFirst({
      where: { id: resumeVersionId, userId: dbUser.id },
      select: { id: true, roleTarget: true },
    });

    if (!version) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    const role = roleTarget || version.roleTarget || "Software Engineer";

    const prompt = `Analyze this resume for ATS (Applicant Tracking System) and role "${role}".
Return a valid JSON object with exactly:
{
  "atsScore": <number 0-100>,
  "suggestions": [
    {
      "type": "CRITICAL" | "IMPROVEMENT" | "OPTIMIZATION",
      "section": "<section name>",
      "title": "<suggestion title>",
      "description": "<actionable description>"
    }
  ]
}
Provide 3-6 specific, actionable suggestions. Focus on: quantifying impact, strong action verbs, keyword alignment with the role, and clarity.
Resume text:\n\n${rawText.slice(0, 6000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";

    let parsedAnalysis: z.infer<typeof analysisSchema>;
    try {
      parsedAnalysis = analysisSchema.parse(JSON.parse(jsonStr));
    } catch {
      return NextResponse.json(
        { error: "AI analysis returned invalid format" },
        { status: 500 }
      );
    }

    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { atsScore: parsedAnalysis.atsScore },
    });

    await prisma.resumeSuggestion.deleteMany({
      where: { resumeVersionId },
    });

    await prisma.resumeSuggestion.createMany({
      data: parsedAnalysis.suggestions.map((s) => ({
        resumeVersionId,
        type: s.type,
        section: s.section,
        title: s.title,
        description: s.description,
      })),
    });

    const updated = await prisma.resumeVersion.findUnique({
      where: { id: resumeVersionId },
      include: { suggestions: true },
    });

    return NextResponse.json({
      id: updated!.id,
      userId: updated!.userId,
      title: updated!.title,
      roleTarget: updated!.roleTarget,
      fileUrl: updated!.fileUrl,
      fileKey: updated!.filePath,
      atsScore: updated!.atsScore,
      status: updated!.status,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
      suggestions: updated!.suggestions.map((s) => ({
        id: s.id,
        resumeVersionId: s.resumeVersionId,
        type: s.type,
        section: s.section,
        title: s.title,
        description: s.description,
        applied: s.applied,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
