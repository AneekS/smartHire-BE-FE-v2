/** Keep in sync with src/config/ollama-models.ts */
export const OLLAMA_EXTRACTION_MODEL = "qwen3:8b";
export const OLLAMA_EMBED_MODEL = "qwen3-embedding:8b";
export const EMBED_VECTOR_DIMENSIONS = 4096;

export const DEPRECATED_OLLAMA_MODELS = [
  "qwen3:32b",
  "qwen3-embedding:4b",
  "llama3.1",
  "llama3",
  "nomic-embed-text",
  "mxbai-embed",
];

export function assertSupportedOllamaModel(model, role) {
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
