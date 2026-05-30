import { env } from "@/config/pipeline-env";
import { BROAD_EXTRACTION_PROMPT } from "@/parsing/prompts";
import { runPassWithRetry } from "@/parsing/extraction-pass-utils";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import { fieldCountFromSchema, logExtractionEvent } from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";

export interface Pass1Result {
  schema: ExtractionResumeSchemaType | null;
  error?: string;
  durationMs: number;
}

export class Pass1BroadExtractor {
  static async run(
    llmText: string,
    opts: {
      resumeId?: string;
      tenantId?: string | null;
      promptOverride?: string;
    } = {}
  ): Promise<Pass1Result> {
    const pass1Prompt = opts.promptOverride ?? BROAD_EXTRACTION_PROMPT;
    const result = await runPassWithRetry(
      1,
      pass1Prompt,
      `RESUME TEXT:\n${llmText}`,
      opts.resumeId,
      opts.tenantId
    );

    if (result.parsed) {
      const schema = result.parsed as ExtractionResumeSchemaType;
      logExtractionEvent({
        event: "pass1_complete",
        resume_id: opts.resumeId ?? "unknown",
        tenant_id: opts.tenantId ?? null,
        pass_number: 1,
        duration_ms: result.durationMs,
        confidence: schema.field_confidence
          ? Object.values(schema.field_confidence).reduce((a, b) => a + b, 0) /
            Object.values(schema.field_confidence).length
          : null,
        field_count: fieldCountFromSchema(schema as unknown as Record<string, unknown>),
        error: null,
      });
      MetricsCollector.record("pass1_complete", { duration_ms: result.durationMs });
      return { schema, durationMs: result.durationMs };
    }

    return { schema: null, error: result.error, durationMs: result.durationMs };
  }

  static get model(): string {
    return env.OLLAMA_EXTRACTION_MODEL;
  }
}
