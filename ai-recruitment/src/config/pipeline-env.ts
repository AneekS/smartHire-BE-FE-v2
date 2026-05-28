import { z } from "zod";
import {
  assertSupportedOllamaModel,
  EMBED_VECTOR_DIMENSIONS,
  OLLAMA_EMBED_MODEL,
  OLLAMA_EXTRACTION_MODEL,
} from "@/config/ollama-models";

function parsePool(raw: string | undefined, fallback: string): string[] {
  if (raw?.trim()) {
    const urls = raw.split(",").map((u) => u.trim()).filter(Boolean);
    if (urls.length > 0) return [...new Set(urls)];
  }
  return [fallback];
}

const PipelineEnvSchema = z.object({
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  MAX_PARALLEL_WORKERS: z.coerce.number().int().positive().default(50),
  CACHE_TTL_FILE: z.coerce.number().int().positive().default(31536000),
  CACHE_TTL_EXTRACTION: z.coerce.number().int().positive().default(86400),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_POOL: z.string().optional(),
  OLLAMA_EXTRACTION_MODEL: z.string().default(OLLAMA_EXTRACTION_MODEL),
  OLLAMA_EMBED_MODEL: z.string().default(OLLAMA_EMBED_MODEL),
  OLLAMA_EMBED_POOL: z.string().optional(),
  /** Max wait per extraction pass (qwen3:8b on CPU often needs 5–10 min). */
  OLLAMA_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
  /** Cap resume chars sent to Ollama (speed + context fit). */
  OLLAMA_EXTRACTION_MAX_CHARS: z.coerce.number().int().positive().default(12_000),
  /** Max JSON tokens per pass (lower = faster on CPU). */
  OLLAMA_EXTRACTION_NUM_PREDICT: z.coerce.number().int().positive().default(4096),
  /** 1 = pass 1 only; 2 = pass 1+2; 3 = full pipeline. */
  OLLAMA_EXTRACTION_MAX_PASSES: z.coerce.number().int().min(1).max(3).default(3),
  /** Skip pass 2/3 for local dev (same as MAX_PASSES=1). */
  EXTRACTION_FAST_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Skip second Ollama call for ATS suggestions (faster local dev). */
  SKIP_RESUME_IMPROVEMENTS_LLM: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Skip Azure embed during sync upload (faster local dev; job match uses heuristics). */
  SKIP_INLINE_EMBED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  OLLAMA_KEEP_ALIVE: z.string().default("10m"),
  /** Min healthy embed nodes at worker startup. Use 1 locally; set 2+ in production with multiple OLLAMA_EMBED_POOL URLs. */
  OLLAMA_MIN_HEALTHY_NODES: z.coerce.number().int().positive().default(1),
  EMBED_VECTOR_DIMENSIONS: z.coerce.number().int().positive().default(EMBED_VECTOR_DIMENSIONS),
  AZURE_SEARCH_ENDPOINT: z.string().optional(),
  AZURE_SEARCH_ADMIN_KEY: z.string().optional(),
  AZURE_SEARCH_INDEX: z.string().default("resumes-index"),
  USE_OLLAMA_EMBEDDINGS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  ASYNC_RESUME_PIPELINE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  ENABLE_OCR: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  TESSERACT_LANG: z.string().default("eng"),
  BLOB_SAS_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  AZURE_EVENTGRID_TOPIC_ENDPOINT: z.string().optional(),
  AZURE_EVENTGRID_TOPIC_KEY: z.string().optional(),
  PREMIUM_TENANT_IDS: z.string().optional(),
  EMBED_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  /** Parse worker jobs — keep at 1 when using a single local Ollama instance. */
  RESUME_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
});

type PipelineEnvBase = z.infer<typeof PipelineEnvSchema>;

export type PipelineEnv = Omit<PipelineEnvBase, "PREMIUM_TENANT_IDS"> & {
  OLLAMA_POOL_URLS: string[];
  OLLAMA_EMBED_POOL_URLS: string[];
  PREMIUM_TENANT_IDS: string[];
};

let cache: PipelineEnv | null = null;

function resolveAsyncPipeline(explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  return process.env.NODE_ENV === "production";
}

function buildEnv(data: PipelineEnvBase): PipelineEnv {
  assertSupportedOllamaModel(data.OLLAMA_EXTRACTION_MODEL, "extraction");
  assertSupportedOllamaModel(data.OLLAMA_EMBED_MODEL, "embed");

  const asyncResumePipeline = resolveAsyncPipeline(data.ASYNC_RESUME_PIPELINE);

  const baseUrl = data.OLLAMA_BASE_URL.startsWith("http")
    ? data.OLLAMA_BASE_URL
    : `http://${data.OLLAMA_BASE_URL}`;
  const poolUrls = parsePool(data.OLLAMA_POOL, baseUrl);
  const embedPoolUrls = parsePool(data.OLLAMA_EMBED_POOL ?? data.OLLAMA_POOL, baseUrl);
  const premiumTenantIds = (data.PREMIUM_TENANT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return {
    ...data,
    ASYNC_RESUME_PIPELINE: asyncResumePipeline,
    OLLAMA_BASE_URL: baseUrl,
    OLLAMA_POOL_URLS: poolUrls,
    OLLAMA_EMBED_POOL_URLS: embedPoolUrls,
    PREMIUM_TENANT_IDS: premiumTenantIds,
  };
}

/** Clear cached env (workers must call after load-env if .env changed at runtime). */
export function resetPipelineEnvCache(): void {
  cache = null;
}

export function getPipelineEnv(): PipelineEnv {
  if (cache) return cache;
  const parsed = PipelineEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid pipeline env: ${parsed.error.issues.map((i) => i.message).join("; ")}`
    );
  }
  cache = buildEnv(parsed.data);
  return cache;
}

/** Parsed env singleton (lazy). */
export const env = new Proxy({} as PipelineEnv, {
  get(_target, prop: keyof PipelineEnv) {
    return getPipelineEnv()[prop];
  },
});

export const EXTRACTION_POOL_URLS = (): string[] => getPipelineEnv().OLLAMA_POOL_URLS;
export const EMBED_POOL_URLS = (): string[] => getPipelineEnv().OLLAMA_EMBED_POOL_URLS;

export function getOllamaPoolUrls(): string[] {
  return getPipelineEnv().OLLAMA_POOL_URLS;
}
