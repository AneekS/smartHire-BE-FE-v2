import crypto from "crypto";
import { getPipelineEnv } from "@/config/pipeline-env";
import type { ExtractionParseResult } from "@/parsing/extractor";
import { isSparseExtraction } from "@/parsing/extraction-quality";

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  pipeline: () => {
    set: (key: string, value: string, mode: string, ttl: number) => unknown;
    exec: () => Promise<unknown>;
  };
};

let redis: RedisClient | null = null;
let redisInit: Promise<RedisClient | null> | null = null;

async function getRedis(): Promise<RedisClient | null> {
  if (redis) return redis;
  if (redisInit) return redisInit;

  redisInit = (async () => {
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const { default: Redis } = await import("ioredis");
      const client = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        tls: url.startsWith("rediss://") ? {} : undefined,
      });
      await client.connect();
      redis = client as unknown as RedisClient;
      return redis;
    } catch (e) {
      console.warn("[dedup] Redis unavailable:", e);
      return null;
    }
  })();

  return redisInit;
}

export function fileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function extractionTextHash(rawText: string): string {
  return crypto.createHash("sha256").update(rawText.slice(0, 3000)).digest("hex");
}

export class DedupCache {
  /** Check file-hash then text-hash layers for a cached extraction result. */
  static async check(
    fileBytes: Buffer,
    rawText: string
  ): Promise<ExtractionParseResult | null> {
    const client = await getRedis();
    if (!client) return null;

    const fileKey = `filehash:${fileHash(fileBytes)}`;
    const cachedByFile = await client.get(fileKey);
    if (cachedByFile) {
      try {
        const hit = JSON.parse(cachedByFile) as ExtractionParseResult;
        if (!isSparseExtraction(hit.schema, rawText)) return hit;
        console.warn("[dedup] Ignoring sparse cached extraction (file hash)");
      } catch {
        /* ignore corrupt cache */
      }
    }

    const textKey = `extraction:${extractionTextHash(rawText)}`;
    const cachedByText = await client.get(textKey);
    if (cachedByText) {
      try {
        const hit = JSON.parse(cachedByText) as ExtractionParseResult;
        if (!isSparseExtraction(hit.schema, rawText)) return hit;
        console.warn("[dedup] Ignoring sparse cached extraction (text hash)");
      } catch {
        return null;
      }
    }

    return null;
  }

  /** Atomically store parse result under both dedup keys. */
  static async store(
    fileBytes: Buffer,
    rawText: string,
    result: ExtractionParseResult
  ): Promise<void> {
    const client = await getRedis();
    if (!client) return;

    if (isSparseExtraction(result.schema, rawText)) {
      console.warn("[dedup] Skipping cache store — extraction too sparse");
      return;
    }

    const env = getPipelineEnv();
    const json = JSON.stringify(result);
    const pipe = client.pipeline();
    pipe.set(`filehash:${fileHash(fileBytes)}`, json, "EX", env.CACHE_TTL_FILE);
    pipe.set(`extraction:${extractionTextHash(rawText)}`, json, "EX", env.CACHE_TTL_EXTRACTION);
    await pipe.exec();
  }
}
