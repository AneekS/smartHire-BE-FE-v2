import { Worker } from "bullmq";
import { getBullConnectionOptions } from "@/lib/redis-options";
import { RecommendationRepository } from "@/repositories/recommendations/recommendation.repository";
import { JobRecommendationService } from "@/services/recommendations/job-recommendation.service";
import { embeddingChecksum, embeddingDimensions, generateEmbedding } from "@/utils/recommendations/embedding";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is required to run embedding worker");
}

const repository = new RecommendationRepository();
const recommendationService = new JobRecommendationService(repository);

type EmbedResumePayload = {
  candidateId: string;
  resumeText: string;
};

type EmbedJobPayload = {
  jobId: string;
  content: string;
};

async function processResume(payload: EmbedResumePayload) {
  const checksum = embeddingChecksum(payload.resumeText);
  const embedding = await generateEmbedding(payload.resumeText);

  await repository.upsertResumeEmbedding({
    candidateId: payload.candidateId,
    checksum,
    embedding,
    dimensions: embeddingDimensions,
  });
}

async function processJob(payload: EmbedJobPayload) {
  const checksum = embeddingChecksum(payload.content);
  const embedding = await generateEmbedding(payload.content);

  await repository.upsertJobEmbeddings([
    {
      jobId: payload.jobId,
      checksum,
      embedding,
      dimensions: embeddingDimensions,
    },
  ]);
}

async function bootstrap() {
  const workerConnection = getBullConnectionOptions(redisUrl);
  if (!workerConnection) {
    throw new Error("Failed to parse REDIS_URL for embedding worker");
  }

  const worker = new Worker(
    "recommendation-embedding-jobs",
    async (job) => {
      if (job.name === "embed-resume") {
        await processResume(job.data as EmbedResumePayload);
        return;
      }

      if (job.name === "embed-job") {
        await processJob(job.data as EmbedJobPayload);
        return;
      }

      if (job.name === "healthcheck") {
        return;
      }

      if (job.name === "precompute-recommendations") {
        const { candidateId, email } = job.data as { candidateId: string; email?: string };
        await recommendationService.getRecommendations({
          candidateId,
          email,
          limit: 50,
        });
        return;
      }

      throw new Error(`Unsupported job name: ${job.name}`);
    },
    {
      connection: workerConnection,
      concurrency: Number(process.env.EMBEDDING_WORKER_CONCURRENCY ?? 10),
    }
  );

  worker.on("failed", (job, error) => {
    console.error("[WORKER][EMBEDDING][FAILED]", job?.id, error);
  });

  worker.on("completed", (job) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[WORKER][EMBEDDING][DONE]", job.id, job.name);
    }
  });
}

void bootstrap();
