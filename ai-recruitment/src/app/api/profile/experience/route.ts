/**
 * /api/profile/experience
 * GET    – list all experiences for authenticated candidate
 * POST   – add a new experience
 * PATCH  – update an existing experience (requires body.id)
 * DELETE – delete an experience (requires ?id=... query param)
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, addExperience, updateExperience, deleteExperience } from "@/services/profile/profile.service";
import { ExperienceSchema, ExperienceUpdateSchema, DeleteByIdSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      return NextResponse.json((candidate as { experiences?: unknown }).experiences ?? []);
    } catch (e) {
      console.error("[GET /api/profile/experience]", e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch experiences" }, { status: 500 });
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const body = await req.json();
      const data = ExperienceSchema.parse(body);
      const candidate = await getOrCreateCandidate(r.user!.email);
      const experience = await addExperience(candidate.id, data);
      return NextResponse.json(experience, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      }
      const msg = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const body = await req.json();
      const { id, ...updates } = ExperienceUpdateSchema.parse(body);
      const candidate = await getOrCreateCandidate(r.user!.email);
      const experience = await updateExperience(id, candidate.id, updates);
      return NextResponse.json(experience);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      }
      const msg = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { searchParams } = new URL(req.url);
      const { id } = DeleteByIdSchema.parse({ id: searchParams.get("id") });
      const candidate = await getOrCreateCandidate(r.user!.email);
      await deleteExperience(id, candidate.id);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
      }
      const msg = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
