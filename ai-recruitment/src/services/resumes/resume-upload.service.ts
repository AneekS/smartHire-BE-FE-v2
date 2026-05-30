import { NextResponse } from "next/server";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate } from "@/services/profile/profile.service";
import { validateResumeUploadFile } from "@/lib/validators/resume.schema";
import { resolveTenantId } from "@/lib/tenant-context";
import { ResumeIngestionService } from "@/services/ResumeIngestionService";
import { RateLimiter } from "@/security/RateLimiter";
import { InputSanitizer } from "@/security/InputSanitizer";
import { AuditLogger } from "@/auth/AuditLogger";

export async function handleResumeUpload(req: AuthenticatedRequest): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get("resume") as File | null;
  const jobIdField = formData.get("job_id") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const validation = validateResumeUploadFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const safeFileName = InputSanitizer.sanitizeFilename(file.name);
  if (InputSanitizer.detectPathTraversal(safeFileName)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const candidate = await getOrCreateCandidate(req.user!.email);
  const userId = candidate.user!.id;
  const tenantId = req.tenantId ?? (await resolveTenantId());
  const mimeType = ResumeIngestionService.inferMimeType(safeFileName, file.type || "");

  const rateLimit = await RateLimiter.uploadLimit(req.user!.id);
  if (!rateLimit.allowed) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Upload rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  const result = await ResumeIngestionService.ingest({
    userId,
    candidateId: candidate.id,
    tenantId,
    fileName: safeFileName,
    buffer,
    mimeType,
    jobId: jobIdField ?? undefined,
  });

  AuditLogger.log("RESUME_UPLOADED", {
    tenantId,
    userId: req.user!.id,
    entityId: result.resumeId,
    entityType: "Resume",
    metadata: { status: result.status, fileName: safeFileName },
    req,
  });

  if (result.status === "COMPLETE") {
    return NextResponse.json({ data: { ...result } }, { status: 201 });
  }

  return NextResponse.json(
    {
      data: {
        resumeId: result.resumeId,
        status: result.status,
        estimatedSeconds: result.estimatedSeconds,
      },
    },
    { status: 202 }
  );
}
