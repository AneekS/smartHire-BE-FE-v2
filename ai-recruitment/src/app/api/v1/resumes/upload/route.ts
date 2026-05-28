import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { getOrCreateCandidate } from "@/services/profile/profile.service";
import { getPipelineEnv, resetPipelineEnvCache } from "@/config/pipeline-env";
import { runResumePipeline } from "@/pipeline/resume-pipeline";
import { validateResumeUploadFile } from "@/lib/validators/resume.schema";
import { prisma } from "@/lib/db";
import { BlobStorage } from "@/storage/blob";
import {
  isEventGridConfigured,
  publishResumeUploadedEvent,
} from "@/lib/event-grid";
import { RedisJobQueue } from "@/queue/redis-queue";
import {
  checkRateLimit,
  getUploadLimit,
  uploadRateLimitKey,
} from "@/lib/rate-limit";

/** Sync Ollama parse can take several minutes on CPU. */
export const maxDuration = 600;

function inferMimeType(fileName: string, fileType: string): string {
  if (fileType && fileType !== "application/octet-stream") return fileType;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    rtf: "application/rtf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return map[ext ?? ""] ?? "application/pdf";
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      resetPipelineEnvCache();
      const formData = await req.formData();
      const file = formData.get("resume") as File | null;
      const tenantIdField = formData.get("tenant_id") as string | null;
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

      const buffer = Buffer.from(await file.arrayBuffer());
      const candidate = await getOrCreateCandidate(authedReq.user!.email);
      const userId = candidate.user!.id;
      const tenantId = tenantIdField?.trim() || candidate.id;
      const mimeType = inferMimeType(file.name, file.type || "");

      const rateLimit = await checkRateLimit(
        uploadRateLimitKey(tenantId),
        getUploadLimit(),
        3600
      );
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: "Upload rate limit exceeded" },
          {
            status: 429,
            headers: { "Retry-After": String(rateLimit.retryAfterSec) },
          }
        );
      }

      const env = getPipelineEnv();

      if (!env.ASYNC_RESUME_PIPELINE) {
        console.log(
          `[upload] sync pipeline model=${env.OLLAMA_EXTRACTION_MODEL} timeout=${env.OLLAMA_EXTRACTION_TIMEOUT_MS}ms fast=${env.EXTRACTION_FAST_MODE}`
        );

        const result = await runResumePipeline({
          userId,
          candidateId: candidate.id,
          fileName: file.name,
          buffer,
          mimeType,
          tenantId,
        });

        return NextResponse.json(
          {
            resumeId: result.resumeId,
            fileName: result.fileName,
            uploadedAt: result.uploadedAt,
            parsed: result.parsed,
            atsScore: result.atsScore,
            scoreBreakdown: result.scoreBreakdown,
            improvements: result.improvements,
            indexed: result.indexed,
            status: "COMPLETE",
            message: "Resume uploaded and parsed",
          },
          { status: 201 }
        );
      }

      await prisma.resumeVersion.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "DRAFT" },
      });

      const draft = await prisma.resumeVersion.create({
        data: {
          userId,
          title: file.name,
          status: "DRAFT",
          pipelineStatus: "QUEUED",
          tenantId,
        },
      });
      const resumeId = draft.id;

      const { blobPath, blobUrl } = await BlobStorage.upload(
        buffer,
        file.name,
        userId,
        resumeId,
        mimeType
      );

      await prisma.resumeVersion.update({
        where: { id: resumeId },
        data: { filePath: blobPath },
      });

      const eventPayload = {
        resumeId,
        tenantId,
        blobUrl,
        userId,
        candidateId: candidate.id,
        fileName: file.name,
        mimeType,
        blobPath,
        jobId: jobIdField ?? undefined,
      };

      if (isEventGridConfigured()) {
        await publishResumeUploadedEvent(eventPayload);
      } else {
        await RedisJobQueue.enqueueParseJob({
          resumeId,
          userId,
          candidateId: candidate.id,
          tenantId,
          fileName: file.name,
          mimeType,
          blobPath,
        });
      }

      return NextResponse.json(
        {
          resumeId,
          status: "QUEUED",
          estimatedSeconds: 120,
        },
        { status: 202 }
      );
    } catch (e) {
      console.error("[upload]", e);
      const msg = e instanceof Error ? e.message : "Upload error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
