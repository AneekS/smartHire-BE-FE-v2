import { EMBED_POOL_URLS, getPipelineEnv } from "@/config/pipeline-env";

export class OllamaPoolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaPoolError";
  }
}

export class OllamaPool {
  private static healthyUrls: string[] = [];
  private static cursor = 0;
  private static lock = false;

  /** Ping embed pool nodes; default min healthy count comes from OLLAMA_MIN_HEALTHY_NODES (default 1). */
  static async initialize(requireMinHealthy?: number): Promise<void> {
    const env = getPipelineEnv();
    const configuredUrls = EMBED_POOL_URLS();
    const uniqueUrls = [...new Set(configuredUrls)];
    const minRequired = requireMinHealthy ?? env.OLLAMA_MIN_HEALTHY_NODES;
    const effectiveMin = Math.min(minRequired, uniqueUrls.length);

    if (minRequired > uniqueUrls.length) {
      console.warn(
        `[OllamaPool] OLLAMA_MIN_HEALTHY_NODES=${minRequired} but only ${uniqueUrls.length} unique URL(s) configured — ` +
          `requiring ${effectiveMin} healthy node(s). Add more URLs to OLLAMA_EMBED_POOL for redundancy.`
      );
    }

    const checks = await Promise.all(
      uniqueUrls.map(async (baseUrl) => {
        try {
          const res = await fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(5_000),
          });
          return res.ok ? baseUrl : null;
        } catch {
          return null;
        }
      })
    );

    OllamaPool.healthyUrls = checks.filter((u): u is string => u !== null);

    if (OllamaPool.healthyUrls.length < effectiveMin) {
      throw new OllamaPoolError(
        `[OllamaPool] FATAL: ${OllamaPool.healthyUrls.length}/${uniqueUrls.length} embed node(s) healthy; ` +
          `need at least ${effectiveMin}. Pool: ${uniqueUrls.join(", ")}. ` +
          `Ensure Ollama is running and: ollama pull ${env.OLLAMA_EMBED_MODEL}`
      );
    }

    console.log(
      `[OllamaPool] ${OllamaPool.healthyUrls.length}/${uniqueUrls.length} embed node(s) healthy ` +
        `(model: ${env.OLLAMA_EMBED_MODEL}, minRequired: ${effectiveMin})`
    );
  }

  static getInstance(): string {
    if (OllamaPool.healthyUrls.length === 0) {
      OllamaPool.healthyUrls = [...new Set(EMBED_POOL_URLS())];
    }
    if (OllamaPool.healthyUrls.length === 0) {
      throw new OllamaPoolError("[OllamaPool] No embed pool URLs configured");
    }

    while (OllamaPool.lock) {
      /* spin briefly for concurrent callers */
    }
    OllamaPool.lock = true;
    try {
      const url = OllamaPool.healthyUrls[OllamaPool.cursor % OllamaPool.healthyUrls.length];
      OllamaPool.cursor = (OllamaPool.cursor + 1) % OllamaPool.healthyUrls.length;
      return url;
    } finally {
      OllamaPool.lock = false;
    }
  }

  static getHealthyCount(): number {
    return OllamaPool.healthyUrls.length;
  }
}
