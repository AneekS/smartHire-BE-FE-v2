/**
 * /api/profile/education
 * GET    – list educations
 * POST   – add education
 * PATCH  – update (requires body.id)
 * DELETE – delete by ?id=
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, addEducation, updateEducation, deleteEducation } from "@/services/profile/profile.service";
import { EducationSchema, EducationUpdateSchema, DeleteByIdSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    const candidate = await getOrCreateCandidate(r.user!.email);
    return NextResponse.json((candidate as { educations?: unknown }).educations ?? []);
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = EducationSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const edu = await addEducation(candidate.id, data);
      return NextResponse.json(edu, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { id, ...updates } = EducationUpdateSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const edu = await updateEducation(id, candidate.id, updates);
      return NextResponse.json(edu);
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
      await deleteEducation(id, candidate.id);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
