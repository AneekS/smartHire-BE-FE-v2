import { SELF_CRITIQUE_PROMPT } from "@/parsing/prompts";
import { averageConfidence, runPassWithRetry } from "@/parsing/extraction-pass-utils";import {
  ExtractionResumeSchema,
  type ExtractionResumeSchemaType,
} from "@/parsing/ExtractionSchema";
import { CrossFieldValidator } from "@/parsing/validator";
import { logExtractionEvent } from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";

export { shouldRunPass3 } from "@/parsing/pass-triggers";

export class Pass3SelfCritique {
  static async run(
    merged: ExtractionResumeSchemaType,
    llmText: string,
    opts: {
      resumeId?: string;
      tenantId?: string | null;
    } = {}
  ): Promise<{ schema: ExtractionResumeSchemaType; changed: boolean }> {
    logExtractionEvent({
      event: "pass3_triggered",
      resume_id: opts.resumeId ?? "unknown",
      tenant_id: opts.tenantId ?? null,
      pass_number: 3,
      duration_ms: null,
      confidence: averageConfidence(merged.field_confidence ?? {}),
      field_count: null,
      error: null,
    });

    const preSnapshot = JSON.stringify(merged);
    const pass3Result = await runPassWithRetry(
      3,
      SELF_CRITIQUE_PROMPT,
      `SOURCE TEXT:\n${llmText}\n\nCURRENT JSON:\n${JSON.stringify(merged, null, 2)}`,
      opts.resumeId,
      opts.tenantId
    );

    let result = merged;
    if (pass3Result.parsed) {
      const validated = ExtractionResumeSchema.safeParse(pass3Result.parsed);
      result = validated.success
        ? validated.data
        : ({ ...merged, ...(pass3Result.parsed as Partial<ExtractionResumeSchemaType>) } as ExtractionResumeSchemaType);
    }

    const changed = JSON.stringify(result) !== preSnapshot;
    return { schema: result, changed };
  }

  static logComplete(
    schema: ExtractionResumeSchemaType,
    changed: boolean,
    opts: { resumeId?: string; tenantId?: string | null }
  ): void {
    const { parseConfidence } = CrossFieldValidator.validate(schema);
    logExtractionEvent({
      event: "pass3_complete",
      resume_id: opts.resumeId ?? "unknown",
      tenant_id: opts.tenantId ?? null,
      pass_number: 3,
      duration_ms: null,
      confidence: parseConfidence,
      field_count: null,
      error: null,
      metadata: { pass3_corrected: changed },
    });
    MetricsCollector.record("pass3_complete", {
      pass3_corrected: changed,
      confidence: parseConfidence,
    });
  }
}
