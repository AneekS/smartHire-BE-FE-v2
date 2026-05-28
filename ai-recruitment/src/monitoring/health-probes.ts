import { prisma } from "@/lib/db";
import { checkEmbedPool, checkExtractionPool } from "@/lib/ollama-extraction-client";
import { RedisJobQueue } from "@/queue/redis-queue";
import { isSearchConfigured } from "@/embedding/search";

export type ServiceStatus = "ok" | "degraded" | "down";

export interface HealthSummary {
  ok: boolean;
  db: ServiceStatus;
  redis: ServiceStatus;
  ollama_pool: { online: number; offline: number };
  azure_search: ServiceStatus;
}

export interface DetailedHealth extends HealthSummary {
  checkedAt: string;
}

export async function probeDatabase(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "down";
  }
}

export async function probeRedis(): Promise<ServiceStatus> {
  try {
    const ok = await RedisJobQueue.ping();
    return ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

export async function probeOllamaPool(): Promise<{ online: number; offline: number; status: ServiceStatus }> {
  try {
    const extraction = await checkExtractionPool();
    const embed = await checkEmbedPool();
    const all = [...extraction, ...embed];
    const online = all.filter((n) => n.ok).length;
    const offline = all.length - online;
    const status: ServiceStatus =
      online === 0 ? "down" : offline > 0 ? "degraded" : "ok";
    return { online, offline, status };
  } catch {
    return { online: 0, offline: 0, status: "down" };
  }
}

export async function probeAzureSearch(): Promise<ServiceStatus> {
  if (!isSearchConfigured()) return "down";
  try {
    const endpoint = process.env.AZURE_SEARCH_ENDPOINT!;
    const key = process.env.AZURE_SEARCH_ADMIN_KEY!;
    const index = process.env.AZURE_SEARCH_INDEX ?? "resumes-index";
    const res = await fetch(`${endpoint}/indexes/${index}?api-version=2024-07-01`, {
      headers: { "api-key": key },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? "ok" : "degraded";
  } catch {
    return "down";
  }
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const [db, redis, ollama, azure_search] = await Promise.all([
    probeDatabase(),
    probeRedis(),
    probeOllamaPool(),
    probeAzureSearch(),
  ]);

  const ok =
    db === "ok" &&
    redis === "ok" &&
    ollama.status !== "down" &&
    (azure_search === "ok" || azure_search === "degraded");

  return {
    ok,
    db,
    redis,
    ollama_pool: { online: ollama.online, offline: ollama.offline },
    azure_search,
  };
}

export async function getDetailedHealth(): Promise<DetailedHealth> {
  const summary = await getHealthSummary();
  return { ...summary, checkedAt: new Date().toISOString() };
}
