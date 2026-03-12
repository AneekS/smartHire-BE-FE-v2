/**
 * /api/profile/skills
 * GET    – list all skills
 * POST   – add single skill
 * PUT    – bulk replace all skills
 * DELETE – remove a skill by ?id=
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, addSkill, deleteSkill, bulkUpsertSkills } from "@/services/profile/profile.service";
import { SkillSchema, BulkSkillSchema, DeleteByIdSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      return NextResponse.json((candidate as { skillRecords?: unknown }).skillRecords ?? []);
    } catch (e) {
      console.error("[GET /api/profile/skills]", e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch skills" }, { status: 500 });
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = SkillSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const skill = await addSkill(candidate.id, data);
      return NextResponse.json(skill, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}

export async function PUT(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { skills } = BulkSkillSchema.parse(await req.json());
      const candidate  = await getOrCreateCandidate(r.user!.email);
      await bulkUpsertSkills(candidate.id, skills);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { id } = DeleteByIdSchema.parse({ id: new URL(req.url).searchParams.get("id") });
      const candidate  = await getOrCreateCandidate(r.user!.email);
      await deleteSkill(id, candidate.id);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
