import { getPipelineEnv } from "@/config/pipeline-env";
import { EMBED_DIMENSIONS } from "@/parsing/constants";
import { BatchEmbedder, embedText, l2Normalize, type EmbedResult } from "@/embedding/BatchEmbedder";
import type { ResumeChunk } from "@/embedding/SectionChunker";

export class EmbeddingService {
  static async embed(text: string): Promise<EmbedResult> {
    return embedText(text);
  }

  static async embedBatch(texts: string[]): Promise<EmbedResult[]> {
    return BatchEmbedder.embedAll(texts);
  }

  /** Weighted average of chunk vectors: sum(v*w)/sum(w), then L2-normalize. */
  static weightedAverage(
    items: Array<{ vector: number[]; weight: number }>
  ): number[] {
    if (!items.length) return [];
    const dims = items[0].vector.length;
    const sum = Array.from({ length: dims }, () => 0);
    let totalWeight = 0;

    for (const { vector, weight } of items) {
      if (vector.length !== dims) continue;
      totalWeight += weight;
      for (let i = 0; i < dims; i += 1) {
        sum[i] += vector[i] * weight;
      }
    }

    if (totalWeight === 0) return sum;
    const averaged = sum.map((v) => v / totalWeight);
    return l2Normalize(averaged);
  }

  static async embedChunks(chunks: ResumeChunk[]): Promise<{
    chunkEmbeddings: EmbedResult[];
    aggregateVector: number[];
  }> {
    const chunkEmbeddings = await BatchEmbedder.embedAll(chunks.map((c) => c.content));
    const env = getPipelineEnv();

    if (env.USE_OLLAMA_EMBEDDINGS) {
      const expected = env.EMBED_VECTOR_DIMENSIONS ?? EMBED_DIMENSIONS;
      for (const emb of chunkEmbeddings) {
        if (emb.dimensions !== expected) {
          throw new Error(
            `Embedding dimension mismatch: expected ${expected}, got ${emb.dimensions}`
          );
        }
      }
    }

    const aggregateVector = EmbeddingService.weightedAverage(
      chunks.map((chunk, i) => ({
        vector: chunkEmbeddings[i].vector,
        weight: chunk.weight,
      }))
    );

    return { chunkEmbeddings, aggregateVector };
  }
}

export { l2Normalize };
