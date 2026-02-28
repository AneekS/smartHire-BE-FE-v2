import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { data: existing } = await client.database
      .from("career_milestones")
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
    if (data.description !== undefined) update.description = data.description;
    if (data.targetDate !== undefined)
      update.target_date = data.targetDate ? new Date(data.targetDate) : null;
    if (data.completed !== undefined) update.completed = data.completed;
    if (data.order !== undefined) update.order = data.order;
    update.updated_at = new Date().toISOString();

    const { data: milestone, error } = await client.database
      .from("career_milestones")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: milestone.id,
      userId: milestone.user_id,
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.target_date,
      completed: milestone.completed,
      order: milestone.order,
      createdAt: milestone.created_at,
      updatedAt: milestone.updated_at,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client, user } = await requireAuth();
    const { id } = await params;

    const { error } = await client.database
      .from("career_milestones")
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
