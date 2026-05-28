/** Canonical Ollama model IDs — update here when upgrading models. */
export const OLLAMA_EXTRACTION_MODEL = "qwen3:8b" as const;
export const OLLAMA_EMBED_MODEL = "qwen3-embedding:8b" as const;
export const EMBED_VECTOR_DIMENSIONS = 4096 as const;

/** Models that must not be used — fail fast if configured. */
export const DEPRECATED_OLLAMA_MODELS = [
  "qwen3:32b",
  "qwen3-embedding:4b",
  "llama3.1",
  "llama3",
  "nomic-embed-text",
  "mxbai-embed",
] as const;

export function assertSupportedOllamaModel(
  model: string,
  role: "extraction" | "embed"
): void {
  const lower = model.toLowerCase();
  for (const deprecated of DEPRECATED_OLLAMA_MODELS) {
    if (lower.includes(deprecated.toLowerCase())) {
      throw new Error(
        `[ollama-models] Deprecated ${role} model "${model}". ` +
          `Use ${role === "embed" ? OLLAMA_EMBED_MODEL : OLLAMA_EXTRACTION_MODEL}.`
      );
    }
  }
  if (role === "embed" && lower.startsWith("qwen3:") && !lower.includes("embedding")) {
    throw new Error(
      `[ollama-models] Chat model "${model}" cannot be used for embeddings. Use ${OLLAMA_EMBED_MODEL}.`
    );
  }
  if (role === "extraction" && lower.includes("embedding")) {
    throw new Error(
      `[ollama-models] Embedding model "${model}" cannot be used for extraction/chat. Use ${OLLAMA_EXTRACTION_MODEL}.`
    );
  }
}
