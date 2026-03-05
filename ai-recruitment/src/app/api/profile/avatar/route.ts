/**
 * /api/profile/avatar
 *
 * POST  – Upload / replace profile avatar (multipart/form-data, field "file")
 * DELETE – Remove avatar (sets avatarUrl to null)
 *
 * Images are saved to /public/uploads/avatars/<candidateId>_<timestamp>.<ext>
 * and the public URL is stored in Candidate.avatarUrl.
 *
 * To swap for cloud storage (S3, Cloudinary, UploadThing), replace only the
 * `saveFile()` helper below – the rest of the handler is storage-agnostic.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate } from "@/services/profile/profile.service";
import { prisma } from "@/lib/db";

// ─── Config ──────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

// ─── Storage adapter (swap this for S3/Cloudinary/UploadThing) ───────────────

async function saveFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const dest = path.join(UPLOAD_DIR, filename);
  await writeFile(dest, buffer);
  return `/uploads/avatars/${filename}`;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate MIME type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Only JPG, PNG, and WEBP images are accepted" },
          { status: 400 }
        );
      }

      // Validate size
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
      const filename = `${candidate.id}_${Date.now()}.${ext}`;

      const avatarUrl = await saveFile(buffer, filename);

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { avatarUrl },
      });

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
      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
