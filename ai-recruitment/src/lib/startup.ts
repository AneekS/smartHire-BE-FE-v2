import { checkEmbedPool, checkExtractionPool, warmupExtractionModel } from "@/lib/ollama-extraction-client";
import { env } from "@/config/pipeline-env";
import { validateEnv } from "@/lib/env";
import { pingBlobStorage, isAzureSearchConfigured } from "@/lib/azureClients";
import { assertRedisHealthy, pingRedis } from "@/lib/bullmq";
import { prisma } from "@/lib/prisma";
import { OllamaPool } from "@/embedding/ollama-pool";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { getLogger } from "@/monitoring/logger";

export async function runStartupChecks(): Promise<void> {
  const log = getLogger();
  try {
    validateEnv();
    log.info("[startup] Environment validated");
  } catch (e) {
    log.error({ err: e }, "[startup] Environment validation failed");
    throw e;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    log.info("[startup] Database OK");
  } catch (e) {
    log.error({ err: e }, "[startup] Database unreachable");
    throw e;
  }

  const blobOk = await pingBlobStorage();
  log.info({ blobOk }, "[startup] Blob storage check");

  const redisOk = await pingRedis();
  log.info({ redisOk }, "[startup] Redis check");

  if (isAzureSearchConfigured()) {
    log.info("[startup] Azure Search configured");
  } else {
    log.warn("[startup] Azure Search not configured — semantic scoring uses heuristics");
  }

  console.log("[startup] Checking Ollama extraction pool...");
  const poolStatus = await checkExtractionPool();

  const healthyNodes = poolStatus.filter((n) => n.ok);
  const unhealthyNodes = poolStatus.filter((n) => !n.ok);

  if (healthyNodes.length === 0) {
    throw new Error(
      `[startup] FATAL: No Ollama extraction nodes available. ` +
        `Ensure ${env.OLLAMA_EXTRACTION_MODEL} is pulled on at least one node.`
    );
  }

  if (unhealthyNodes.length > 0) {
    console.warn(
      `[startup] ${unhealthyNodes.length} Ollama node(s) unreachable:`,
      unhealthyNodes.map((n) => n.url)
    );
  }

  console.log(
    `[startup] Extraction pool OK: ${healthyNodes.length}/${poolStatus.length} nodes healthy. ` +
      `Models: extraction/chat=${env.OLLAMA_EXTRACTION_MODEL}, embed=${env.OLLAMA_EMBED_MODEL} (${env.EMBED_VECTOR_DIMENSIONS}d)`
  );

  if (process.env.NODE_ENV === "production" && env.EXTRACTION_FAST_MODE) {
    console.warn(
      "[startup] EXTRACTION_FAST_MODE=true in production — only pass 1 runs. Set EXTRACTION_FAST_MODE=false and OLLAMA_EXTRACTION_MAX_PASSES=3 for full accuracy."
    );
  }

  if (env.OLLAMA_EXTRACTION_MAX_PASSES < 3 && !env.EXTRACTION_FAST_MODE) {
    console.warn(
      `[startup] OLLAMA_EXTRACTION_MAX_PASSES=${env.OLLAMA_EXTRACTION_MAX_PASSES} — pass 3 self-critique is skipped unless stillSparse.`
    );
  }

  warmupExtractionModel().catch((e) => console.warn("[startup] Ollama warmup failed:", e));

  if (process.env.REDIS_URL) {
    try {
      await assertRedisHealthy();
      console.log("[startup] Redis queue OK");
    } catch (e) {
      console.warn("[startup] Redis unavailable:", e);
    }
  }

  if (env.USE_OLLAMA_EMBEDDINGS) {
    try {
      await OllamaPool.initialize();
      const embedStatus = await checkEmbedPool();
      const embedHealthy = embedStatus.filter((n) => n.ok && n.hasEmbedModel);
      if (embedHealthy.length === 0) {
        console.warn(
          `[startup] Embed pool reachable but ${env.OLLAMA_EMBED_MODEL} not found — run: ollama pull ${env.OLLAMA_EMBED_MODEL}`
        );
      } else {
        console.log(`[startup] Embed pool OK: ${OllamaPool.getHealthyCount()} node(s)`);
      }
    } catch (e) {
      console.warn("[startup] Embed pool health check failed:", e);
    }
  }

  try {
    await SkillCanonicalizer.load();
    console.log("[startup] Skill canonicalizer loaded");
  } catch (e) {
    console.warn("[startup] Skill canonicalizer load failed:", e);
  }
}
