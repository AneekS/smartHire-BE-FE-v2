/**
 * /api/profile/privacy
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, upsertPrivacy } from "@/services/profile/profile.service";
import { PrivacySchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      return NextResponse.json((candidate as { privacy?: unknown }).privacy ?? {
        isPublic: true,
        visibleToRecruiters: true,
        anonymousMode: false,
        hideContactInfo: false,
      });
    } catch (e) {
      console.error("[GET /api/profile/privacy]", e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to fetch privacy settings" }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = PrivacySchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const privacy = await upsertPrivacy(candidate.id, data);
      return NextResponse.json(privacy);
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
