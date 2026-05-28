import { getPipelineEnv } from "@/config/pipeline-env";

/** Limit resume text sent to Ollama to reduce latency on CPU-bound local inference. */
export function truncateResumeForLlm(rawText: string): string {
  const max = getPipelineEnv().OLLAMA_EXTRACTION_MAX_CHARS;
  const trimmed = rawText.trim();
  if (trimmed.length <= max) return trimmed;
  return (
    trimmed.slice(0, max) +
    "\n\n[... resume truncated for parsing; prioritize content above ...]"
  );
}
