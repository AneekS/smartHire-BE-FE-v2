import { DriftDetector } from "../../src/feedback/drift";

export async function driftCheckerHandler(): Promise<{ driftScore: number; sampleSize: number }> {
  console.log("[drift-checker] Embedding drift check starting");
  const result = await DriftDetector.computeEmbeddingDrift();
  console.log("[drift-checker] Result:", result);
  return result;
}
