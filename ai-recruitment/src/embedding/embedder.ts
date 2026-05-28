import { getPipelineEnv } from "@/config/pipeline-env";
import { OllamaConcurrencyManager } from "@/lib/ollama-concurrency";
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

/** L2-normalize a vector for cosine similarity in Azure Search / pgvector. */
export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0 || !Number.isFinite(norm)) return vector;
  return vector.map((v) => v / norm);
}

async function ollamaEmbedBatchAt(
  baseUrl: string,
  texts: string[],
  model: string
): Promise<number[][]> {
  return OllamaConcurrencyManager.run(() =>
    ollamaEmbedBatchAtInner(baseUrl, texts, model)
  );
}

async function ollamaEmbedBatchAtInner(
  baseUrl: string,
  texts: string[],
  model: string
): Promise<number[][]> {
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
    signal: AbortSignal.timeout(120_000),
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

export async function embedText(text: string, baseUrl?: string): Promise<EmbedResult> {
  const env = getPipelineEnv();
  if (!env.USE_OLLAMA_EMBEDDINGS) {
    const vector = l2Normalize(await hashEmbedding(text));
    return { vector, dimensions: hashDimensions, source: "hash" };
  }

  try {
    const url = baseUrl ?? OllamaPool.getInstance();
    const vectors = await ollamaEmbedBatchAt(url, [text], env.OLLAMA_EMBED_MODEL);
    const vector = l2Normalize(vectors[0]);
    return {
      vector,
      dimensions: vector.length,
      source: "ollama",
      embeddingModel: env.OLLAMA_EMBED_MODEL,
    };
  } catch (e) {
    console.warn("[embedder] Ollama fallback to hash:", e);
    const vector = await hashEmbedding(text);
    return { vector, dimensions: hashDimensions, source: "hash" };
  }
}

export class BatchEmbedder {
  static async embedAll(texts: string[], baseUrl?: string): Promise<EmbedResult[]> {
    if (texts.length === 0) return [];

    const env = getPipelineEnv();
    if (!env.USE_OLLAMA_EMBEDDINGS) {
      return Promise.all(texts.map((t) => embedText(t)));
    }

    try {
      const url = baseUrl ?? OllamaPool.getInstance();
      const vectors = await ollamaEmbedBatchAt(url, texts, env.OLLAMA_EMBED_MODEL);
      return vectors.map((vector) => ({
        vector: l2Normalize(vector),
        dimensions: vector.length,
        source: "ollama" as const,
        embeddingModel: env.OLLAMA_EMBED_MODEL,
      }));
    } catch (e) {
      console.warn("[BatchEmbedder] batch failed, falling back per-text:", e);
      return Promise.all(texts.map((t) => embedText(t)));
    }
  }
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
