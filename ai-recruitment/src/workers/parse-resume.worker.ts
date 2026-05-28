import { Worker } from "bullmq";
import { getPipelineEnv, resetPipelineEnvCache } from "@/config/pipeline-env";
import { getBullConnectionOptions } from "@/lib/redis-options";
import { EMBED_QUEUE_NAMES } from "@/queue/redis-queue";
import { downloadResumeBlob } from "@/lib/azure-storage";
import { runParseStageFromBlob } from "@/pipeline/parse-stage";
import { assertRedisHealthy } from "@/queue/redis-queue";
import { warmupExtractionModel } from "@/lib/ollama-extraction-client";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run the parse worker");
}

const connection = getBullConnectionOptions(redisUrl);
if (!connection) {
  throw new Error("Failed to parse REDIS_URL for parse worker");
}

async function bootstrap() {
  resetPipelineEnvCache();
  const pipelineEnv = getPipelineEnv();
  const concurrency = pipelineEnv.RESUME_WORKER_CONCURRENCY;
  const lockDuration = pipelineEnv.OLLAMA_EXTRACTION_TIMEOUT_MS + 120_000;

  console.log(
    `[WORKER][PARSE] model=${pipelineEnv.OLLAMA_EXTRACTION_MODEL} timeout=${pipelineEnv.OLLAMA_EXTRACTION_TIMEOUT_MS}ms fastMode=${pipelineEnv.EXTRACTION_FAST_MODE} concurrency=${concurrency}`
  );

  await assertRedisHealthy();
  await warmupExtractionModel();

  const worker = new Worker(
    EMBED_QUEUE_NAMES.PARSE,
    async (job) => {
      if (job.name !== "parse-resume") return;

      const data = job.data as {
        resumeId: string;
        userId: string;
        candidateId: string;
        tenantId?: string;
        fileName: string;
        mimeType: string;
        blobPath: string;
      };

      const buffer = await downloadResumeBlob(data.blobPath);
      return runParseStageFromBlob({
        resumeId: data.resumeId,
        userId: data.userId,
        candidateId: data.candidateId,
        tenantId: data.tenantId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        buffer,
      });
    },
    {
      connection: { ...connection },
      concurrency,
      lockDuration,
    }
  );

  worker.on("completed", (job) => {
    console.log("[WORKER][PARSE][DONE]", job.id);
  });

  worker.on("failed", (job, err) => {
    console.error("[WORKER][PARSE][FAILED]", job?.id, err);
  });

  console.log("[WORKER][PARSE] listening on", EMBED_QUEUE_NAMES.PARSE);
}

bootstrap().catch((e) => {
  console.error("[WORKER][PARSE] bootstrap failed:", e);
  process.exit(1);
});
