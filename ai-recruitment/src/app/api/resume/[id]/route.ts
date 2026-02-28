import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  roleTarget: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
  atsScore: z.number().int().min(0).max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
});

function mapVersion(v: Record<string, unknown>) {
  return {
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
    suggestions: (v.resume_suggestions as Record<string, unknown>[] ?? []).map(
      (s) => ({
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
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: version, error } = await client.database
      .from("resume_versions")
      .select("*, resume_suggestions(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapVersion(version));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: existing } = await client.database
      .from("resume_versions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.roleTarget !== undefined) update.role_target = data.roleTarget;
    if (data.fileUrl !== undefined)
      update.file_url = data.fileUrl === "" ? null : data.fileUrl;
    if (data.atsScore !== undefined) update.ats_score = data.atsScore;
    if (data.status !== undefined) update.status = data.status;
    update.updated_at = new Date().toISOString();

    const { data: version, error } = await client.database
      .from("resume_versions")
      .update(update)
      .eq("id", id)
      .select("*, resume_suggestions(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapVersion(version));
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { error } = await client.database
      .from("resume_versions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
