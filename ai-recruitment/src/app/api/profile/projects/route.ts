/**
 * /api/profile/projects
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, addProject, updateProject, deleteProject } from "@/services/profile/profile.service";
import { ProjectSchema, ProjectUpdateSchema, DeleteByIdSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      return NextResponse.json((candidate as { projects?: unknown }).projects ?? []);
    } catch (e) {
      console.error("[GET /api/profile/projects]", e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch projects" }, { status: 500 });
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = ProjectSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const project = await addProject(candidate.id, data);
      return NextResponse.json(project, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { id, ...updates } = ProjectUpdateSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const project = await updateProject(id, candidate.id, updates);
      return NextResponse.json(project);
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
      const candidate = await getOrCreateCandidate(r.user!.email);
      await deleteProject(id, candidate.id);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
