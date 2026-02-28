import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});

const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  currentLevel: z.number().int().min(0).max(100).optional(),
  targetLevel: z.number().int().min(0).max(100).optional(),
});

function mapMilestone(m: Record<string, unknown>) {
  return {
    id: m.id,
    userId: m.user_id,
    title: m.title,
    description: m.description,
    targetDate: m.target_date,
    completed: m.completed,
    order: m.order,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

function mapSkill(s: Record<string, unknown>) {
  return {
    id: s.id,
    userId: s.user_id,
    name: s.name,
    category: s.category,
    currentLevel: s.current_level,
    targetLevel: s.target_level,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export async function GET() {
  try {
    const { client, user } = await requireAuth();

    const [milestonesRes, skillsRes] = await Promise.all([
      client.database
        .from("career_milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("order", { ascending: true }),
      client.database
        .from("skill_goals")
        .select("*")
        .eq("user_id", user.id),
    ]);

    const milestones = (milestonesRes.data ?? []).map(mapMilestone);
    const skills = (skillsRes.data ?? []).map(mapSkill);

    return NextResponse.json({ milestones, skills });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { client, user } = await requireAuth();
    const body = await req.json();

    if (body.type === "milestone") {
      const data = milestoneSchema.parse(body);
      const { data: existing } = await client.database
        .from("career_milestones")
        .select("id")
        .eq("user_id", user.id);
      const order = data.order ?? (existing?.length ?? 0);

      const { data: milestone, error } = await client.database
        .from("career_milestones")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description ?? null,
          target_date: data.targetDate ?? null,
          completed: data.completed ?? false,
          order,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(mapMilestone(milestone));
    }

    if (body.type === "skill") {
      const data = skillSchema.parse(body);
      const { data: skill, error } = await client.database
        .from("skill_goals")
        .insert({
          user_id: user.id,
          name: data.name,
          category: data.category ?? null,
          current_level: data.currentLevel ?? 0,
          target_level: data.targetLevel ?? 100,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(mapSkill(skill));
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
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
