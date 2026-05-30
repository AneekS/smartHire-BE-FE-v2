import { getPipelineEnv } from "@/config/pipeline-env";
import { EMBED_DIMENSIONS } from "@/parsing/constants";
import { OllamaConcurrencyManager } from "@/parsing/OllamaConcurrencyManager";
import { OllamaPool } from "@/embedding/ollama-pool";
import {
  generateEmbedding as hashEmbedding,
  embeddingDimensions as hashDimensions,
} from "@/utils/recommendations/embedding";

export interface EmbedResult {
  vector: number[];
  dimensions: number;
  source: "ollama" | "hash";
  embeddingModel?: string;
}

export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0 || !Number.isFinite(norm)) return vector;
  return vector.map((v) => v / norm);
}

function assertDimensions(vector: number[], expected: number): void {
  if (vector.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expected}, got ${vector.length}`
    );
  }
}

async function ollamaEmbedBatchAtInner(
  baseUrl: string,
  texts: string[],
  model: string,
  signal?: AbortSignal
): Promise<number[][]> {
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama embed batch failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { embeddings: number[][] };
  if (!data.embeddings?.length) {
    throw new Error("Ollama embed batch returned empty vectors");
  }
  return data.embeddings;
}

async function embedWithTimeout(
  baseUrl: string,
  texts: string[],
  model: string,
  timeoutMs = 10_000
): Promise<number[][]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await ollamaEmbedBatchAtInner(
      baseUrl,
      texts,
      model,
      controller.signal
    );
    for (const vec of result) {
      if (vec.length !== EMBED_DIMENSIONS) {
        throw new Error(`Bad embedding dim: ${vec.length}`);
      }
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

async function embedWithRetry(
  baseUrl: string,
  texts: string[],
  model: string,
  attempts = 3
): Promise<number[][]> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await embedWithTimeout(baseUrl, texts, model);
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Embedding failed after retries");
}

async function ollamaEmbedBatchAt(
  baseUrl: string,
  texts: string[],
  model: string
): Promise<number[][]> {
  return OllamaConcurrencyManager.run(() =>
    embedWithRetry(baseUrl, texts, model)
  );
}

export class BatchEmbedder {
  static async embedAll(texts: string[], baseUrl?: string): Promise<EmbedResult[]> {
    if (texts.length === 0) return [];

    const env = getPipelineEnv();
    const expectedDims = env.EMBED_VECTOR_DIMENSIONS ?? EMBED_DIMENSIONS;

    if (!env.USE_OLLAMA_EMBEDDINGS) {
      return Promise.all(
        texts.map(async (t) => {
          const vector = l2Normalize(await hashEmbedding(t));
          return { vector, dimensions: hashDimensions, source: "hash" as const };
        })
      );
    }

    const url = baseUrl ?? OllamaPool.getInstance();
    const vectors = await ollamaEmbedBatchAt(url, texts, env.OLLAMA_EMBED_MODEL);

    return vectors.map((vector) => {
      assertDimensions(vector, expectedDims);
      return {
        vector: l2Normalize(vector),
        dimensions: vector.length,
        source: "ollama" as const,
        embeddingModel: env.OLLAMA_EMBED_MODEL,
      };
    });
  }
}

export async function embedText(text: string, baseUrl?: string): Promise<EmbedResult> {
  const [result] = await BatchEmbedder.embedAll([text], baseUrl);
  return result;
}

export async function embedBatch(
  texts: string[],
  concurrency?: number
): Promise<EmbedResult[]> {
  const env = getPipelineEnv();
  if (env.USE_OLLAMA_EMBEDDINGS && texts.length > 1) {
    return BatchEmbedder.embedAll(texts);
  }

  const limit = concurrency ?? Math.min(env.MAX_PARALLEL_WORKERS, 10);
  const results: EmbedResult[] = new Array(texts.length);
  let idx = 0;

  async function worker() {
    while (idx < texts.length) {
      const i = idx++;
      results[i] = await embedText(texts[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, texts.length) }, () => worker()));
  return results;
}
