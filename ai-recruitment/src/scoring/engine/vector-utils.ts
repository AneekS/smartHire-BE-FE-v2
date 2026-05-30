import crypto from "crypto";
import { EMBEDDING_DIMENSIONS } from "@/scoring/constants";

function hashToUnit(input: string): number {
  const digest = crypto.createHash("sha256").update(input).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

/** Deterministic L2-normalized vector from text — no network calls. */
export function deterministicEmbed(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return Array.from({ length: dimensions }, () => 0);
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const vector = Array.from({ length: dimensions }, () => 0);

  for (const token of tokens) {
    for (let i = 0; i < dimensions; i += 1) {
      vector[i] += hashToUnit(`${token}:${i}`);
    }
  }

  const magnitude = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Weighted average of same-dimension vectors. */
export function aggregateVectors(
  items: Array<{ vector: number[]; weight: number }>
): number[] | null {
  if (!items.length) return null;
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

  if (totalWeight === 0) return null;
  const averaged = sum.map((v) => v / totalWeight);
  const magnitude = Math.sqrt(averaged.reduce((acc, v) => acc + v * v, 0));
  if (magnitude === 0) return averaged;
  return averaged.map((v) => v / magnitude);
}
