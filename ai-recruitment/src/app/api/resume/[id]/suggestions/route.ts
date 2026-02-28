import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const applySchema = z.object({ suggestionIds: z.array(z.string()) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: version } = await client.database
      .from("resume_versions")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!version) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { suggestionIds } = applySchema.parse(body);

    for (const sid of suggestionIds) {
      await client.database
        .from("resume_suggestions")
        .update({ applied: true })
        .eq("id", sid)
        .eq("resume_version_id", id);
    }

    return NextResponse.json({ ok: true });
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
