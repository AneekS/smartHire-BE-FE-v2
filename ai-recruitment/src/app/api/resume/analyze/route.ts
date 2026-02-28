import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";
import { insforge } from "@/lib/insforge";

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
    const { client, user } = await requireAuth();

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

    const { data: version } = await client.database
      .from("resume_versions")
      .select("id, role_target")
      .eq("id", resumeVersionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!version) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    const role =
      roleTarget || (version.role_target as string) || "Software Engineer";

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

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
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

    await client.database
      .from("resume_versions")
      .update({
        ats_score: parsedAnalysis.atsScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumeVersionId);

    await client.database
      .from("resume_suggestions")
      .delete()
      .eq("resume_version_id", resumeVersionId);

    for (const s of parsedAnalysis.suggestions) {
      await client.database.from("resume_suggestions").insert({
        resume_version_id: resumeVersionId,
        type: s.type,
        section: s.section,
        title: s.title,
        description: s.description,
      });
    }

    const { data: updated } = await client.database
      .from("resume_versions")
      .select("*, resume_suggestions(*)")
      .eq("id", resumeVersionId)
      .single();

    return NextResponse.json({
      id: updated.id,
      userId: updated.user_id,
      title: updated.title,
      roleTarget: updated.role_target,
      fileUrl: updated.file_url,
      fileKey: updated.file_key,
      atsScore: updated.ats_score,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      suggestions: (updated.resume_suggestions ?? []).map(
        (s: Record<string, unknown>) => ({
          id: s.id,
          resumeVersionId: s.resume_version_id,
          type: s.type,
          section: s.section,
          title: s.title,
          description: s.description,
          applied: s.applied,
          createdAt: s.created_at,
        })
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
