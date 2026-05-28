import { env, EMBED_POOL_URLS, EXTRACTION_POOL_URLS } from "@/config/pipeline-env";
import { OllamaConcurrencyManager } from "@/lib/ollama-concurrency";
import { logExtractionEvent } from "@/monitoring/logger";
import * as Sentry from "@sentry/nextjs";

let poolCursor = 0;

export function pickExtractionNode(): string {
  const pool = EXTRACTION_POOL_URLS();
  const url = pool[poolCursor % pool.length];
  poolCursor++;
  return url;
}

export class OllamaExtractError extends Error {
  constructor(
    public meta: {
      resumeId?: string;
      passNumber: number;
      errorType: "timeout" | "api_error" | "json_parse" | "pool_exhausted";
      statusCode?: number;
      detail?: string;
    }
  ) {
    super(
      `Ollama extract error [pass ${meta.passNumber}]: ${meta.errorType}${meta.detail ? ` — ${meta.detail}` : ""}`
    );
    this.name = "OllamaExtractError";
  }
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

/** Pre-load extraction model into Ollama memory to avoid cold-start timeouts on first upload. */
export async function warmupExtractionModel(): Promise<void> {
  const baseUrl = EXTRACTION_POOL_URLS()[0];
  if (!baseUrl) return;

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(Math.min(env.OLLAMA_EXTRACTION_TIMEOUT_MS, 180_000)),
      body: JSON.stringify({
        model: env.OLLAMA_EXTRACTION_MODEL,
        keep_alive: env.OLLAMA_KEEP_ALIVE,
        stream: false,
        messages: [{ role: "user", content: "ready" }],
        options: { num_predict: 1, temperature: 0 },
      }),
    });
    if (!res.ok) {
      console.warn(`[ollama] warmup failed: ${res.status}`);
      return;
    }
    console.log(`[ollama] extraction model warmed: ${env.OLLAMA_EXTRACTION_MODEL}`);
  } catch (e) {
    console.warn("[ollama] extraction warmup skipped:", e);
  }
}

function predictTokensForPass(passNumber: 1 | 2 | 3): number {
  const base = env.OLLAMA_EXTRACTION_NUM_PREDICT;
  if (passNumber === 1) return base;
  return Math.min(2048, Math.floor(base * 0.75));
}

export async function ollamaExtract(params: {
  system: string;
  user: string;
  passNumber: 1 | 2 | 3;
  resumeId?: string;
}): Promise<string> {
  return OllamaConcurrencyManager.run(() => ollamaExtractInner(params));
}

async function ollamaExtractInner(params: {
  system: string;
  user: string;
  passNumber: 1 | 2 | 3;
  resumeId?: string;
}): Promise<string> {
  const { system, user, passNumber, resumeId } = params;
  const baseUrl = pickExtractionNode();
  const endpoint = `${baseUrl}/api/chat`;
  const timeoutMs = env.OLLAMA_EXTRACTION_TIMEOUT_MS;
  const numPredict = predictTokensForPass(passNumber);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.OLLAMA_EXTRACTION_MODEL,
        format: "json",
        stream: false,
        keep_alive: env.OLLAMA_KEEP_ALIVE,
        options: {
          temperature: 0,
          num_ctx: 16384,
          num_predict: numPredict,
          top_k: 1,
        },
        // Qwen3: disable chain-of-thought so JSON is not buried in thinking blocks
        ...(env.OLLAMA_EXTRACTION_MODEL.includes("qwen3")
          ? { think: false }
          : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      throw new OllamaExtractError({
        resumeId,
        passNumber,
        errorType: "api_error",
        statusCode: response.status,
        detail: await response.text().catch(() => ""),
      });
    }

    const data = (await response.json()) as OllamaChatResponse;
    return data.message.content;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      const timeoutErr = new OllamaExtractError({
        resumeId,
        passNumber,
        errorType: "timeout",
        detail: `exceeded ${Math.round(timeoutMs / 1000)}s — try OLLAMA_EXTRACTION_TIMEOUT_MS or a smaller model`,
      });
      logExtractionEvent({
        event: "ollama_timeout",
        resume_id: resumeId ?? "unknown",
        tenant_id: null,
        pass_number: passNumber,
        duration_ms: timeoutMs,
        confidence: null,
        field_count: null,
        error: timeoutErr.message,
      });
      Sentry.captureException(timeoutErr, {
        tags: { source: "ollama_extract", errorType: "timeout" },
        extra: { resumeId, passNumber },
      });
      throw timeoutErr;
    }
    if (err instanceof OllamaExtractError) {
      Sentry.captureException(err, {
        tags: { source: "ollama_extract", errorType: err.meta.errorType },
        extra: { resumeId, passNumber },
      });
      throw err;
    }
    const apiErr = new OllamaExtractError({
      resumeId,
      passNumber,
      errorType: "api_error",
      detail: (err as Error).message,
    });
    Sentry.captureException(apiErr, {
      tags: { source: "ollama_extract", errorType: "api_error" },
      extra: { resumeId, passNumber },
    });
    throw apiErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkExtractionPool(): Promise<
  { url: string; ok: boolean; models?: string[] }[]
> {
  const pool = EXTRACTION_POOL_URLS();
  return Promise.all(
    pool.map(async (url) => {
      try {
        const resp = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) return { url, ok: false };
        const data = (await resp.json()) as { models?: { name: string }[] };
        const models = (data.models ?? []).map((m) => m.name);
        const prefix = env.OLLAMA_EXTRACTION_MODEL.split(":")[0];
        const hasModel = models.some((m) => m.startsWith(prefix));
        if (!hasModel) {
          console.warn(`[OllamaPool] ${url} missing model ${env.OLLAMA_EXTRACTION_MODEL}`);
        }
        return { url, ok: true, models };
      } catch {
        return { url, ok: false };
      }
    })
  );
}

export async function checkEmbedPool(): Promise<
  { url: string; ok: boolean; hasEmbedModel?: boolean }[]
> {
  const pool = EMBED_POOL_URLS();
  const prefix = env.OLLAMA_EMBED_MODEL.split(":")[0];

  return Promise.all(
    pool.map(async (url) => {
      try {
        const resp = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) return { url, ok: false };
        const data = (await resp.json()) as { models?: { name: string }[] };
        const models = (data.models ?? []).map((m) => m.name);
        const hasEmbedModel = models.some((m) => m.startsWith(prefix));
        if (!hasEmbedModel) {
          console.warn(`[OllamaPool] ${url} missing embed model ${env.OLLAMA_EMBED_MODEL}`);
        }
        return { url, ok: true, hasEmbedModel };
      } catch {
        return { url, ok: false };
      }
    })
  );
}
