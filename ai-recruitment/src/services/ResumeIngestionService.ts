import { getPipelineEnv, resetPipelineEnvCache } from "@/config/pipeline-env";
import { prisma } from "@/lib/prisma";
import { BlobStorageService } from "@/lib/BlobStorageService";
import { isEventGridConfigured, publishResumeUploadedEvent } from "@/lib/event-grid";
import { trackEvent } from "@/monitoring/appInsights";
import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";
import { runResumePipeline } from "@/pipeline/resume-pipeline";
import { RedisJobQueue } from "@/queue/redis-queue";
import type { StudioImprovement } from "@/services/resumes/resume-studio.service";

export interface ResumeIngestInput {
  userId: string;
  candidateId: string;
  tenantId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  jobId?: string;
}

export type ResumeIngestResult =
  | {
      resumeId: string;
      status: "COMPLETE";
      fileName: string;
      uploadedAt: string;
      atsScore?: number | null;
      indexed?: boolean;
      parsed?: ParsedResumeUI;
      scoreBreakdown?: Record<string, unknown>;
      improvements?: StudioImprovement[];
    }
  | {
      resumeId: string;
      status: "QUEUED";
      estimatedSeconds: number;
    };

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

function completeIngestPayload(
  result: Awaited<ReturnType<typeof runResumePipeline>>
): Extract<ResumeIngestResult, { status: "COMPLETE" }> {
  const improvements = (result.improvements ?? [])
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      return {
        id: String(o.id ?? `imp_${i}`),
        severity: "suggestion" as const,
        section: String(o.section ?? "general"),
        fieldPath: String(o.fieldPath ?? o.section ?? "summary"),
        title: String(o.title ?? "Improvement"),
        description: String(o.description ?? ""),
        originalText: String(o.originalText ?? ""),
        suggestedText: String(o.suggestedText ?? ""),
        impact: String(o.impact ?? o.description ?? ""),
        applied: Boolean(o.applied),
      };
    })
    .filter((x): x is StudioImprovement => x != null);

  return {
    resumeId: result.resumeId,
    status: "COMPLETE",
    fileName: result.fileName,
    uploadedAt: result.uploadedAt,
    atsScore: result.atsScore,
    indexed: Boolean(result.indexed),
    parsed: result.parsed,
    scoreBreakdown: result.scoreBreakdown,
    improvements,
  };
}

export class ResumeIngestionService {
  static inferMimeType = inferMimeType;

  static async ingest(input: ResumeIngestInput): Promise<ResumeIngestResult> {
    resetPipelineEnvCache();
    const mimeType = input.mimeType || inferMimeType(input.fileName, input.mimeType);
    const env = getPipelineEnv();

    if (!env.ASYNC_RESUME_PIPELINE) {
      const result = await runResumePipeline({
        userId: input.userId,
        candidateId: input.candidateId,
        fileName: input.fileName,
        buffer: input.buffer,
        mimeType,
        tenantId: input.tenantId,
      });

      trackEvent("resume_ingested", {
        tenantId: input.tenantId,
        status: "COMPLETE",
        resumeId: result.resumeId,
      });

      return completeIngestPayload(result);
    }

    await prisma.resumeVersion.updateMany({
      where: { userId: input.userId, status: "ACTIVE" },
      data: { status: "DRAFT" },
    });

    const draft = await prisma.resumeVersion.create({
      data: {
        userId: input.userId,
        title: input.fileName,
        status: "DRAFT",
        pipelineStatus: "QUEUED",
        tenantId: input.tenantId,
      },
    });

    const blobPath = await BlobStorageService.uploadResume(
      input.tenantId,
      input.candidateId,
      draft.id,
      input.fileName,
      input.buffer,
      mimeType
    );
    const blobUrl = await BlobStorageService.generateSasUrl(blobPath);

    await prisma.resumeVersion.update({
      where: { id: draft.id },
      data: { filePath: blobPath },
    });

    const eventPayload = {
      resumeId: draft.id,
      tenantId: input.tenantId,
      blobUrl,
      userId: input.userId,
      candidateId: input.candidateId,
      fileName: input.fileName,
      mimeType,
      blobPath,
      jobId: input.jobId,
    };

    const canEnqueueAsync =
      isEventGridConfigured() || (await RedisJobQueue.ping());

    if (!canEnqueueAsync) {
      console.warn(
        "[ResumeIngestion] Async pipeline configured but Redis/Event Grid unavailable — running sync parse"
      );
      await prisma.resumeVersion.delete({ where: { id: draft.id } }).catch(() => {});
      const sync = await runResumePipeline({
        userId: input.userId,
        candidateId: input.candidateId,
        fileName: input.fileName,
        buffer: input.buffer,
        mimeType,
        tenantId: input.tenantId,
      });
      trackEvent("resume_ingested", {
        tenantId: input.tenantId,
        status: "COMPLETE",
        resumeId: sync.resumeId,
      });
      return completeIngestPayload(sync);
    }

    if (isEventGridConfigured()) {
      await publishResumeUploadedEvent(eventPayload);
    } else {
      await RedisJobQueue.enqueueParseJob({
        resumeId: draft.id,
        userId: input.userId,
        candidateId: input.candidateId,
        tenantId: input.tenantId,
        fileName: input.fileName,
        mimeType,
        blobPath,
      });
    }

    trackEvent("resume_ingested", {
      tenantId: input.tenantId,
      status: "QUEUED",
      resumeId: draft.id,
    });

    return {
      resumeId: draft.id,
      status: "QUEUED",
      estimatedSeconds: 120,
    };
  }
}
