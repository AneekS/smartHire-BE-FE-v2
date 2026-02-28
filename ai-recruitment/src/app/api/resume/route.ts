import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  roleTarget: z.string().optional(),
});

export async function GET() {
  try {
    const { client, user } = await requireAuth();
    const { data: versions, error } = await client.database
      .from("resume_versions")
      .select("*, resume_suggestions(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mapped = (versions ?? []).map((v) => ({
      id: v.id,
      userId: v.user_id,
      title: v.title,
      roleTarget: v.role_target,
      fileUrl: v.file_url,
      fileKey: v.file_key,
      atsScore: v.ats_score,
      status: v.status,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
      suggestions: (v.resume_suggestions ?? []).map((s: Record<string, unknown>) => ({
        id: s.id,
        resumeVersionId: s.resume_version_id,
        type: s.type,
        section: s.section,
        title: s.title,
        description: s.description,
        applied: s.applied,
        createdAt: s.created_at,
      })),
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user } = await requireAuth();
    const body = await req.json();
    const { title, roleTarget } = createSchema.parse(body);

    const { data: version, error } = await client.database
      .from("resume_versions")
      .insert({
        user_id: user.id,
        title,
        role_target: roleTarget ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: version.id,
      userId: version.user_id,
      title: version.title,
      roleTarget: version.role_target,
      fileUrl: version.file_url,
      fileKey: version.file_key,
      atsScore: version.ats_score,
      status: version.status,
      createdAt: version.created_at,
      updatedAt: version.updated_at,
      suggestions: [],
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
