/**
 * /api/profile/career-preferences
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, upsertCareerPreference } from "@/services/profile/profile.service";
import { CareerPreferenceSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      return NextResponse.json((candidate as { careerPreference?: unknown }).careerPreference ?? null);
    } catch (e) {
      console.error("[GET /api/profile/career-preferences]", e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch career preferences" }, { status: 500 });
    }
  });
}

export async function PUT(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = CareerPreferenceSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const pref = await upsertCareerPreference(candidate.id, data);
      return NextResponse.json(pref);
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
