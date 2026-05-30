import { describe, it, expect, vi } from "vitest";
import { l2Normalize } from "@/embedding/embedder";

describe("l2Normalize", () => {
  it("normalizes vector to unit length", () => {
    const v = l2Normalize([3, 4]);
    const norm = Math.sqrt(v[0] ** 2 + v[1] ** 2);
    expect(norm).toBeCloseTo(1, 5);
    expect(v[0]).toBeCloseTo(0.6, 5);
    expect(v[1]).toBeCloseTo(0.8, 5);
  });

  it("returns zero vector unchanged when norm is zero", () => {
    expect(l2Normalize([0, 0])).toEqual([0, 0]);
  });
});

describe("BatchEmbedder dimension assert", () => {
  it("throws when Ollama returns wrong vector length", async () => {
    vi.stubEnv("USE_OLLAMA_EMBEDDINGS", "true");
    vi.doMock("@/config/pipeline-env", () => ({
      getPipelineEnv: () => ({
        USE_OLLAMA_EMBEDDINGS: true,
        EMBED_VECTOR_DIMENSIONS: 4096,
        OLLAMA_EMBED_MODEL: "test-model",
        MAX_PARALLEL_WORKERS: 3,
      }),
    }));
    vi.doMock("@/parsing/OllamaConcurrencyManager", () => ({
      OllamaConcurrencyManager: { run: (fn: () => Promise<unknown>) => fn() },
    }));
    vi.doMock("@/embedding/ollama-pool", () => ({
      OllamaPool: { getInstance: () => "http://localhost:11434" },
    }));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
    }) as unknown as typeof fetch;

    vi.resetModules();
    const { BatchEmbedder: Embedder } = await import("@/embedding/BatchEmbedder");
    await expect(Embedder.embedAll(["hello"])).rejects.toThrow(
      /Bad embedding dim|dimension mismatch/i
    );

    vi.doUnmock("@/config/pipeline-env");
    vi.doUnmock("@/parsing/OllamaConcurrencyManager");
    vi.doUnmock("@/embedding/ollama-pool");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});
