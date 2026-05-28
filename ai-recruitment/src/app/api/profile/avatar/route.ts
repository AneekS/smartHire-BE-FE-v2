import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getOrCreateCandidate,
  invalidateCandidateProfileCache,
} from "@/services/profile/profile.service";
import { prisma } from "@/lib/db";
import { uploadAvatar, getAvatarSasUrl } from "@/lib/azure-storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG, and WEBP images are accepted" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.byteLength > MAX_BYTES) {
        return NextResponse.json(
          { error: "Image must be smaller than 5 MB" },
          { status: 400 }
        );
      }

      const candidate = await getOrCreateCandidate(r.user!.email);
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");

      const blobPath = await uploadAvatar(candidate.id, buffer, ext, file.type);

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { avatarUrl: blobPath },
      });

      await invalidateCandidateProfileCache(r.user!.email);

      const avatarUrl = await getAvatarSasUrl(blobPath);
      return NextResponse.json({ avatarUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const candidate = await getOrCreateCandidate(r.user!.email);
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { avatarUrl: null },
      });

      await invalidateCandidateProfileCache(r.user!.email);
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
