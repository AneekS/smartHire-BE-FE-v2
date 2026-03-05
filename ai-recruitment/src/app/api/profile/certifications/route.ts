/**
 * /api/profile/certifications
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate, addCertification, updateCertification, deleteCertification } from "@/services/profile/profile.service";
import { CertificationSchema, CertificationUpdateSchema, DeleteByIdSchema } from "@/lib/validators/profile.schemas";
import { z } from "zod";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    const candidate = await getOrCreateCandidate(r.user!.email);
    return NextResponse.json((candidate as { certifications?: unknown }).certifications ?? []);
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const data = CertificationSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const cert = await addCertification(candidate.id, data);
      return NextResponse.json(cert, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { id, ...updates } = CertificationUpdateSchema.parse(await req.json());
      const candidate = await getOrCreateCandidate(r.user!.email);
      const cert = await updateCertification(id, candidate.id, updates);
      return NextResponse.json(cert);
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
      await deleteCertification(id, candidate.id);
      return NextResponse.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
    }
  });
}
