import { prisma } from "@/lib/db";
import { BatchEmbedder } from "@/embedding/embedder";
import { sampleRecentDocuments } from "@/embedding/search";
import { RedisJobQueue } from "@/queue/redis-queue";
import { sendOpsAlert } from "@/lib/ops-alerts";
import { cosineSimilarity, shuffle } from "@/feedback/stats";

const SAMPLE_SIZE = 500;
const LOOKBACK_DAYS = 7;
const DRIFT_THRESHOLD = 0.05;

export class DriftDetector {
  static async computeEmbeddingDrift(): Promise<{
    driftScore: number;
    sampleSize: number;
    triggeredReindex: boolean;
  }> {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    let documents: Awaited<ReturnType<typeof sampleRecentDocuments>> = [];
    try {
      documents = await sampleRecentDocuments({ since, limit: SAMPLE_SIZE * 2 });
    } catch (e) {
      console.warn("[drift] Azure Search sampling unavailable:", e);
      await prisma.embeddingDriftRun.create({
        data: {
          driftScore: 0,
          sampleSize: 0,
          triggeredReindex: false,
          details: { error: String(e) },
        },
      });
      return { driftScore: 0, sampleSize: 0, triggeredReindex: false };
    }

    const sample = shuffle(documents).slice(0, SAMPLE_SIZE);
    if (sample.length === 0) {
      await prisma.embeddingDriftRun.create({
        data: {
          driftScore: 0,
          sampleSize: 0,
          triggeredReindex: false,
          details: { message: "No documents in lookback window" },
        },
      });
      return { driftScore: 0, sampleSize: 0, triggeredReindex: false };
    }

    const texts = sample.map((d) => d.content);
    const newEmbeddings = await BatchEmbedder.embedAll(texts);

    const similarities: number[] = [];
    for (let i = 0; i < sample.length; i++) {
      const stored = sample[i].contentVector;
      const fresh = newEmbeddings[i]?.vector ?? [];
      if (stored.length > 0 && fresh.length > 0) {
        similarities.push(cosineSimilarity(stored, fresh));
      }
    }

    const meanSim =
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : 1;
    const driftScore = 1 - meanSim;
    const triggeredReindex = driftScore > DRIFT_THRESHOLD;

    let enqueued = 0;
    if (triggeredReindex) {
      enqueued = await RedisJobQueue.enqueueBulkReindex({ since });
      await sendOpsAlert({
        subject: "Embedding drift detected — reindex enqueued",
        body: `drift_score=${driftScore.toFixed(4)}, sample_size=${similarities.length}, jobs_enqueued=${enqueued}`,
        severity: "critical",
      });
    }

    await prisma.embeddingDriftRun.create({
      data: {
        driftScore,
        sampleSize: similarities.length,
        triggeredReindex,
        details: {
          meanSimilarity: meanSim,
          threshold: DRIFT_THRESHOLD,
          jobsEnqueued: enqueued,
        },
      },
    });

    console.log("[drift]", {
      driftScore,
      sampleSize: similarities.length,
      triggeredReindex,
      enqueued,
    });

    return {
      driftScore,
      sampleSize: similarities.length,
      triggeredReindex,
    };
  }
}
