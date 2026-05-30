import { Worker, type Job } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { getPipelineEnv, resetPipelineEnvCache } from "@/config/pipeline-env";
import { getWorkerConnection } from "@/lib/bullmq";
import { BlobStorageService } from "@/lib/BlobStorageService";
import { prisma } from "@/lib/prisma";
import { EMBED_QUEUE_NAMES, assertRedisHealthy } from "@/queue/redis-queue";
import { runParseStageFromBlob } from "@/pipeline/ParseStage";
import { markPipelineFailed } from "@/lib/pipeline-status";
import { warmupExtractionModel } from "@/lib/ollama-extraction-client";
import { configureLogger } from "@/monitoring/logger";

export interface ParseJobPayload {
  resumeId: string;
  userId: string;
  candidateId: string;
  tenantId?: string;
  fileName: string;
  mimeType: string;
  blobPath: string;
}

export async function processParseJob(payload: ParseJobPayload): Promise<{
  resumeId: string;
  embedJobId?: string;
}> {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: payload.resumeId },
  });
  if (!version) {
    throw new Error(`ResumeVersion ${payload.resumeId} not found`);
  }

  const buffer = await BlobStorageService.download(payload.blobPath);

  const result = await runParseStageFromBlob({
    resumeId: payload.resumeId,
    userId: payload.userId,
    candidateId: payload.candidateId,
    tenantId: payload.tenantId,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    buffer,
  });

  await prisma.resumeVersion.update({
    where: { id: payload.resumeId },
    data: { pipelineStatus: "PARSED" },
  });

  return {
    resumeId: result.resumeId,
    embedJobId: result.embedJobId,
  };
}

export async function startParseWorker(): Promise<Worker> {
  configureLogger();
  resetPipelineEnvCache();
  const pipelineEnv = getPipelineEnv();
  const connection = getWorkerConnection();
  const concurrency = pipelineEnv.RESUME_WORKER_CONCURRENCY;
  const lockDuration = pipelineEnv.OLLAMA_EXTRACTION_TIMEOUT_MS + 120_000;

  console.log(
    `[WORKER][PARSE] model=${pipelineEnv.OLLAMA_EXTRACTION_MODEL} concurrency=${concurrency}`
  );

  await assertRedisHealthy();
  await warmupExtractionModel();

  const worker = new Worker(
    EMBED_QUEUE_NAMES.PARSE,
    async (job: Job) => {
      if (job.name !== "parse-resume") return;
      return processParseJob(job.data as ParseJobPayload);
    },
    { connection: { ...connection }, concurrency, lockDuration }
  );

  worker.on("completed", (job) => {
    console.log("[WORKER][PARSE][DONE]", job.id);
  });

  worker.on("failed", async (job, err) => {
    console.error("[WORKER][PARSE][FAILED]", job?.id, err);
    Sentry.captureException(err, {
      tags: { worker: "parse" },
      extra: { jobId: job?.id, resumeId: (job?.data as ParseJobPayload)?.resumeId },
    });
    const resumeId = (job?.data as ParseJobPayload | undefined)?.resumeId;
    if (resumeId) {
      await markPipelineFailed(resumeId, err instanceof Error ? err.message : "Parse failed");
      await prisma.resumeVersion
        .update({
          where: { id: resumeId },
          data: { pipelineStatus: "FAILED" },
        })
        .catch(() => undefined);
    }
  });

  console.log("[WORKER][PARSE] listening on", EMBED_QUEUE_NAMES.PARSE);
  return worker;
}
