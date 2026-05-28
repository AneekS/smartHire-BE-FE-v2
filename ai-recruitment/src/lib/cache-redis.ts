import crypto from "crypto";
import { getPipelineEnv } from "@/config/pipeline-env";

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: string, ttl: number) => Promise<unknown>;
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
      console.warn("[cache-redis] unavailable:", e);
      return null;
    }
  })();

  return redisInit;
}

export function fileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function getCachedExtraction(fileSha: string): Promise<string | null> {
  const client = await getRedis();
  if (!client) return null;
  const env = getPipelineEnv();
  return client.get(`resume:extract:${fileSha}`);
}

export async function setCachedExtraction(
  fileSha: string,
  text: string
): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  const env = getPipelineEnv();
  await client.set(`resume:extract:${fileSha}`, text, "EX", env.CACHE_TTL_EXTRACTION);
}

export async function getCachedParse(fileSha: string): Promise<string | null> {
  const client = await getRedis();
  if (!client) return null;
  return client.get(`resume:parse:${fileSha}`);
}

export async function setCachedParse(fileSha: string, json: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  const env = getPipelineEnv();
  await client.set(`resume:parse:${fileSha}`, json, "EX", env.CACHE_TTL_FILE);
}

const JD_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function jdTextHash(jdText: string): string {
  return crypto.createHash("sha256").update(jdText.trim()).digest("hex");
}

export async function getCachedJd(jdHash: string): Promise<string | null> {
  const client = await getRedis();
  if (!client) return null;
  return client.get(`jd:${jdHash}`);
}

export async function setCachedJd(jdHash: string, json: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  await client.set(`jd:${jdHash}`, json, "EX", JD_CACHE_TTL_SECONDS);
}
