import pino from "pino";
import { prisma } from "@/lib/db";

export type ExtractionEventName =
  | "extraction_started"
  | "pass1_complete"
  | "pass2_triggered"
  | "pass3_complete"
  | "embedding_queued"
  | "embedding_complete"
  | "scoring_complete"
  | "validation_failed"
  | "pydantic_error"
  | "ollama_timeout"
  | "dedup_hit"
  | "dedup_miss";

export interface ExtractionLogEvent {
  event: ExtractionEventName | string;
  resume_id: string;
  tenant_id: string | null;
  pass_number: number | null;
  duration_ms: number | null;
  confidence: number | null;
  field_count: number | null;
  error: string | null;
  metadata?: Record<string, unknown>;
}

let loggerInstance: pino.Logger | null = null;

export function configureLogger(): pino.Logger {
  if (loggerInstance) return loggerInstance;

  const isDev = process.env.NODE_ENV !== "production";
  loggerInstance = pino({
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" },
          },
        }
      : {}),
    base: { service: "smarthire-pipeline" },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return loggerInstance;
}

export function getLogger(): pino.Logger {
  return configureLogger();
}

function countPopulatedFields(schema: Record<string, unknown> | undefined): number {
  if (!schema) return 0;
  let count = 0;
  for (const [key, val] of Object.entries(schema)) {
    if (key === "field_confidence") continue;
    if (val === null || val === undefined) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === "object" && !Array.isArray(val)) {
      const inner = val as Record<string, unknown>;
      if (Object.values(inner).some((v) => v != null && v !== "")) count++;
    } else if (val !== "") {
      count++;
    }
  }
  return count;
}

export function logExtractionEvent(payload: ExtractionLogEvent): void {
  const log = getLogger();
  log.info(payload);

  void persistExtractionEvent(payload).catch((err) => {
    log.warn({ err, event: payload.event }, "Failed to persist extraction event");
  });
}

async function persistExtractionEvent(payload: ExtractionLogEvent): Promise<void> {
  await prisma.extractionEvent.create({
    data: {
      resumeId: payload.resume_id,
      tenantId: payload.tenant_id ?? undefined,
      event: payload.event,
      passNumber: payload.pass_number ?? undefined,
      durationMs: payload.duration_ms ?? undefined,
      confidence: payload.confidence ?? undefined,
      fieldCount: payload.field_count ?? undefined,
      error: payload.error ?? undefined,
      metadata: payload.metadata ? (payload.metadata as object) : undefined,
    },
  });
}

export function fieldCountFromSchema(schema: Record<string, unknown> | undefined): number {
  return countPopulatedFields(schema);
}
