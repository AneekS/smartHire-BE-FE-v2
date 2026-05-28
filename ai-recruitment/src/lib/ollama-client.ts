import { EMBED_POOL_URLS, getOllamaPoolUrls, getPipelineEnv } from "@/config/pipeline-env";

export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

let roundRobinIndex = 0;

function poolOrder(): string[] {
  const pool = getOllamaPoolUrls();
  if (pool.length <= 1) return pool;
  const start = roundRobinIndex % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

async function withPool<T>(
  operation: (baseUrl: string) => Promise<T>,
  label: string
): Promise<T> {
  const urls = poolOrder();
  let lastError: unknown;

  for (let i = 0; i < urls.length; i++) {
    const baseUrl = urls[i];
    try {
      const result = await operation(baseUrl);
      roundRobinIndex = (roundRobinIndex + i + 1) % Math.max(urls.length, 1);
      return result;
    } catch (e) {
      lastError = e;
      console.warn(`[ollama] ${label} failed on ${baseUrl}:`, e);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OllamaError(`${label} failed on all Ollama pool nodes`);
}

export async function ollamaHealthCheck(): Promise<boolean> {
  const pool = getOllamaPoolUrls();
  const results = await Promise.all(
    pool.map(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(5_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    })
  );
  return results.some(Boolean);
}

export async function ollamaChat(
  system: string,
  user: string,
  model?: string
): Promise<string> {
  const env = getPipelineEnv();

  return withPool(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? env.OLLAMA_EXTRACTION_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        format: "json",
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OllamaError(`Ollama chat failed: ${res.status} ${text}`, res.status);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) throw new OllamaError("Ollama returned empty response");
    return content;
  }, "chat");
}

export async function ollamaEmbed(text: string, model?: string): Promise<number[]> {
  const env = getPipelineEnv();

  return withPool(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? env.OLLAMA_EMBED_MODEL,
        input: text,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new OllamaError(`Ollama embed failed: ${res.status} ${body}`, res.status);
    }

    const data = (await res.json()) as { embeddings?: number[][]; embedding?: number[] };
    const vector = data.embeddings?.[0] ?? data.embedding;
    if (!vector?.length) throw new OllamaError("Ollama embed returned empty vector");
    return vector;
  }, "embed");
}

let embedCursor = 0;

function pickEmbedNode(): string {
  const pool = EMBED_POOL_URLS();
  const url = pool[embedCursor % pool.length];
  embedCursor++;
  return url;
}

export async function ollamaEmbedBatch(texts: string[], model?: string): Promise<number[][]> {
  const env = getPipelineEnv();
  const baseUrl = pickEmbedNode();

  const response = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: model ?? env.OLLAMA_EMBED_MODEL, input: texts }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new OllamaError(`Ollama embed batch failed: ${response.status} ${body}`, response.status);
  }

  const data = (await response.json()) as { embeddings: number[][] };
  if (!data.embeddings?.length) {
    throw new OllamaError("Ollama embed batch returned empty vectors");
  }
  return data.embeddings;
}

/** Strip markdown fences and parse JSON from model output. */
export function parseJsonFromModel(content: string): unknown {
  const cleaned = content
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
