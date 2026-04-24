import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { generateFeedbackReport } from "@/lib/interviews/feedback-generator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data, error } = await client.database
      .from("interview_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fire and forget. The feedback page polls until the row lands.
    generateFeedbackReport(client, id).catch((err) =>
      console.error("generateFeedbackReport failed", err),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
