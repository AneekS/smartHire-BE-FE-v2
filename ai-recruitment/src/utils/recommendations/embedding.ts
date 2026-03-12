import crypto from "crypto";

const EMBEDDING_DIMENSIONS = 128;

function hashToUnitValue(input: string): number {
  const digest = crypto.createHash("sha256").update(input).digest();
  const int = digest.readUInt32BE(0);
  return int / 0xffffffff;
}

// Deterministic embedding fallback keeps behavior stable when external AI providers are unavailable.
export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);

  for (const token of tokens) {
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i += 1) {
      const value = hashToUnitValue(`${token}:${i}`);
      vector[i] += value;
    }
  }

  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (magnitude === 0) return vector;

  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    const a = vectorA[i];
    const b = vectorB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function embeddingChecksum(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export const embeddingDimensions = EMBEDDING_DIMENSIONS;
