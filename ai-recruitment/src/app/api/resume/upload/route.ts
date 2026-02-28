import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { RESUMES_BUCKET } from "@/lib/insforge";

export async function POST(req: Request) {
  try {
    const { client, user } = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const resumeVersionId = formData.get("resumeVersionId") as string | null;

    if (!file || !resumeVersionId) {
      return NextResponse.json(
        { error: "Missing file or resumeVersionId" },
        { status: 400 }
      );
    }

    const { data: version } = await client.database
      .from("resume_versions")
      .select("id")
      .eq("id", resumeVersionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!version) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const path = `${user.id}/${resumeVersionId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { data: uploadData, error } = await client.storage
      .from(RESUMES_BUCKET)
      .upload(path, file);

    if (error || !uploadData) {
      return NextResponse.json(
        { error: error?.message || "Upload failed" },
        { status: 500 }
      );
    }

    const { data: updated, error: updateError } = await client.database
      .from("resume_versions")
      .update({
        file_url: uploadData.url,
        file_key: uploadData.key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumeVersionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      fileUrl: updated.file_url,
      fileKey: updated.file_key,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
