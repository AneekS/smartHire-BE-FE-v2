import { Worker, type Job } from "bullmq";
import * as Sentry from "@sentry/nextjs";
import { getWorkerConnection } from "@/lib/bullmq";
import { QUEUE_NAMES } from "@/lib/queues";
import { runEmbedStage } from "@/pipeline/EmbedStage";
import { prisma } from "@/lib/prisma";

export interface ResumeIndexJobPayload {
  resumeId: string;
  candidateId: string;
  tenantId?: string;
}

export async function processResumeIndexJob(
  payload: ResumeIndexJobPayload
): Promise<{ indexed: number }> {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: payload.resumeId },
    include: { parsedResume: true },
  });

  if (!version?.parsedResume) {
    throw new Error(`ParsedResume missing for resume ${payload.resumeId}`);
  }

  return runEmbedStage({
    resumeId: payload.resumeId,
    candidateId: payload.candidateId,
    tenantId: payload.tenantId ?? version.tenantId ?? undefined,
  });
}

export async function startResumeIndexWorker(): Promise<Worker> {
  const connection = getWorkerConnection();

  const worker = new Worker(
    QUEUE_NAMES.RESUME_PIPELINE,
    async (job: Job) => {
      if (job.name === "index-resume-chunks") {
        return processResumeIndexJob(job.data as ResumeIndexJobPayload);
      }

      if (job.name === "parse-index") {
        const { runResumePipeline } = await import("@/pipeline/ResumePipeline");
        const data = job.data as {
          userId: string;
          candidateId: string;
          fileName: string;
          mimeType: string;
          bufferBase64: string;
          tenantId?: string;
        };
        return runResumePipeline({
          userId: data.userId,
          candidateId: data.candidateId,
          fileName: data.fileName,
          buffer: Buffer.from(data.bufferBase64, "base64"),
          mimeType: data.mimeType,
          tenantId: data.tenantId,
        });
      }
    },
    {
      connection,
      concurrency: Number(process.env.RESUME_WORKER_CONCURRENCY ?? 3),
    }
  );

  worker.on("failed", (job, err) => {
    Sentry.captureException(err, { tags: { worker: "resume-index" }, extra: { jobId: job?.id } });
    console.error("[WORKER][RESUME-INDEX][FAILED]", job?.id, err);
  });

  worker.on("completed", (job) => {
    console.log("[WORKER][RESUME-INDEX][DONE]", job.id, job.name);
  });

  console.log("[WORKER][RESUME-INDEX] listening on", QUEUE_NAMES.RESUME_PIPELINE);
  return worker;
}

startResumeIndexWorker().catch((e) => {
  console.error("[WORKER][RESUME-INDEX] bootstrap failed:", e);
  process.exit(1);
});
