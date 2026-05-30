import { ollamaExtract, OllamaExtractError } from "@/lib/ollama-extraction-client";
import {
  ExtractionResumeSchema,
  type ExtractionResumeSchemaType,
} from "@/parsing/ExtractionSchema";
import { parseJsonFromModel } from "@/parsing/json-from-model";
import { fieldCountFromSchema, logExtractionEvent } from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";
import * as Sentry from "@sentry/nextjs";

export async function runPassWithRetry(
  passNumber: 1 | 2 | 3,
  system: string,
  user: string,
  resumeId?: string,
  tenantId?: string | null
): Promise<{
  raw: string;
  parsed: ExtractionResumeSchemaType | Partial<ExtractionResumeSchemaType> | null;
  error?: string;
  durationMs: number;
}> {
  let raw = "";
  const started = Date.now();

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptUser =
        attempt === 2
          ? `${user}\n\nPREVIOUS ATTEMPT FAILED ZOD VALIDATION. Fix schema errors and return valid JSON only.`
          : user;

      raw = await ollamaExtract({ system, user: promptUser, passNumber, resumeId });
      const json = parseJsonFromModel(raw);

      if (passNumber === 3 || passNumber === 1) {
        const validated = ExtractionResumeSchema.safeParse(json);
        if (validated.success) {
          return { raw, parsed: validated.data, durationMs: Date.now() - started };
        }
        if (attempt === 1) {
          logExtractionEvent({
            event: "pydantic_error",
            resume_id: resumeId ?? "unknown",
            tenant_id: tenantId ?? null,
            pass_number: passNumber,
            duration_ms: Date.now() - started,
            confidence: null,
            field_count: null,
            error: validated.error.message.slice(0, 500),
          });
          MetricsCollector.record("pydantic_error");
          Sentry.captureMessage("Zod validation failed on extraction pass", {
            level: "warning",
            tags: { validation: "zod", passNumber: String(passNumber) },
            extra: { resumeId, error: validated.error.message.slice(0, 200) },
          });
          continue;
        }
        return {
          raw,
          parsed: json as Partial<ExtractionResumeSchemaType>,
          error: validated.error.message,
          durationMs: Date.now() - started,
        };
      }

      return {
        raw,
        parsed: json as Partial<ExtractionResumeSchemaType>,
        durationMs: Date.now() - started,
      };
    } catch (err) {
      if (err instanceof OllamaExtractError && err.meta.errorType === "timeout") throw err;
      if (err instanceof SyntaxError && attempt === 1) continue;
      return { raw, parsed: null, error: (err as Error).message, durationMs: Date.now() - started };
    }
  }

  return { raw, parsed: null, error: "Exceeded retry attempts", durationMs: Date.now() - started };
}

export {
  getLowConfidenceFields,
  averageConfidence,
  hasMissingRequiredFields,
} from "@/parsing/extraction-confidence";

export function mergePassResults(
  pass1: ExtractionResumeSchemaType,
  pass2Partial: Partial<ExtractionResumeSchemaType>,
  lowFields: string[]
): ExtractionResumeSchemaType {
  const merged = { ...pass1 };

  for (const field of lowFields) {
    if (
      field in pass2Partial &&
      pass2Partial[field as keyof ExtractionResumeSchemaType] !== undefined
    ) {
      (merged as Record<string, unknown>)[field] =
        pass2Partial[field as keyof ExtractionResumeSchemaType];
    }
  }

  if (pass2Partial.field_confidence) {
    merged.field_confidence = {
      ...pass1.field_confidence,
      ...pass2Partial.field_confidence,
    };
  }

  return merged;
}

export { fieldCountFromSchema, OllamaExtractError };
