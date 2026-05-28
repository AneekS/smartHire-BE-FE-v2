import { env } from "@/config/pipeline-env";
import { ollamaExtract, OllamaExtractError } from "@/lib/ollama-extraction-client";
import { ollamaChat } from "@/lib/ollama-client";
import {
  extractionToLegacy,
  extractionToUI,
} from "@/models/adapters/extraction-adapter";
import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";
import type { ResumeSchemaType } from "@/models/resume.schema";
import {
  ExtractionResumeSchema,
  emptyExtractionSchema,
  type ExtractionResumeSchemaType,
} from "@/models/extraction.schema";
import { getFewShots, type Industry } from "@/parsing/few-shots";
import { sectionsToExtractorContext } from "@/parsing/section-detector";
import type { FormatType, SectionType } from "@/parsing/preprocess.types";
import {
  BROAD_EXTRACTION_PROMPT,
  GAP_FILL_PROMPT,
  IMPROVEMENTS_PROMPT,
  SECTION_EDUCATION_PROMPT,
  SECTION_EXPERIENCE_PROMPT,
  SECTION_SKILLS_PROMPT,
  SELF_CRITIQUE_PROMPT,
} from "@/parsing/prompts";
import { CrossFieldValidator } from "@/parsing/validator";
import { truncateResumeForLlm } from "@/parsing/truncate-for-llm";
import { parseJsonFromModel } from "@/parsing/json-from-model";
import { isSparseExtraction } from "@/parsing/extraction-quality";
import { enrichSparseExtraction } from "@/parsing/heuristic-enricher";
import {
  fieldCountFromSchema,
  logExtractionEvent,
} from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";
import * as Sentry from "@sentry/nextjs";

export type { ExtractionResumeSchemaType };

export interface ExtractionParseResult {
  schema: ExtractionResumeSchemaType;
  parseConfidence: number;
  issues: string[];
  flags: string[];
  passesRun: (1 | 2 | 3)[];
  extractionModel: string;
  pass3Changed?: boolean;
}

/** Pipeline / API result with legacy schema + UI adapter. */
export interface ParseResult {
  resume: ResumeSchemaType;
  ui: ParsedResumeUI;
  schema: ExtractionResumeSchemaType;
  parseConfidence: number;
  issues: string[];
  flags: string[];
  passesRun: (1 | 2 | 3)[];
  extractionModel: string;
  passCount: number;
}

function getLowConfidenceFields(
  confidenceMap: Record<string, number>,
  threshold: number
): string[] {
  return Object.entries(confidenceMap)
    .filter(([, v]) => v < threshold)
    .map(([k]) => k);
}

function extractContextSections(
  rawText: string,
  lowFields: string[],
  detectedSections?: Partial<Record<SectionType, string>>
): Record<string, string> {
  if (detectedSections && Object.keys(detectedSections).length > 0) {
    const fromDetector = sectionsToExtractorContext(detectedSections, lowFields);
    if (Object.keys(fromDetector).length > 0) return fromDetector;
  }

  const sections: Record<string, string> = {};
  const sectionKeywords: Record<string, string[]> = {
    experience: ["experience", "work history", "employment"],
    education: ["education", "academic", "qualification"],
    skills: ["skills", "technical skills", "competencies"],
    achievements: ["achievements", "accomplishments", "awards"],
    certifications: ["certifications", "licenses", "credentials"],
    personalInfo: ["contact", "email", "phone"],
    summary: ["summary", "profile", "objective"],
    projects: ["projects", "portfolio"],
  };

  const lines = rawText.split("\n");

  for (const field of lowFields) {
    const keywords = sectionKeywords[field] ?? [field];
    const startIdx = lines.findIndex((l) =>
      keywords.some((kw) => l.toLowerCase().includes(kw))
    );
    if (startIdx !== -1) {
      sections[field] = lines.slice(startIdx, startIdx + 30).join("\n");
    }
  }

  return sections;
}

function mergePassResults(
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

async function runPassWithRetry(
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

      return { raw, parsed: json as Partial<ExtractionResumeSchemaType>, durationMs: Date.now() - started };
    } catch (err) {
      if (err instanceof OllamaExtractError && err.meta.errorType === "timeout") throw err;
      if (err instanceof SyntaxError && attempt === 1) continue;
      return { raw, parsed: null, error: (err as Error).message, durationMs: Date.now() - started };
    }
  }

  return { raw, parsed: null, error: "Exceeded retry attempts", durationMs: Date.now() - started };
}

export function wrapExtractionResult(extraction: ExtractionParseResult): ParseResult {
  const resume = extractionToLegacy(extraction.schema, extraction.parseConfidence);
  return {
    resume,
    ui: extractionToUI(extraction.schema),
    schema: extraction.schema,
    parseConfidence: extraction.parseConfidence,
    issues: extraction.issues,
    flags: extraction.flags,
    passesRun: extraction.passesRun,
    extractionModel: extraction.extractionModel,
    passCount: extraction.passesRun.length,
  };
}

export class MultiPassExtractor {
  private async runSectionRetries(
    merged: ExtractionResumeSchemaType,
    rawText: string,
    llmText: string,
    sections?: Partial<Record<SectionType, string>>,
    resumeId?: string,
    tenantId?: string | null
  ): Promise<ExtractionResumeSchemaType> {
    let result = merged;
    const experienceText =
      sections?.EXPERIENCE ??
      extractContextSections(llmText, ["experience"], sections).experience;
    const educationText =
      sections?.EDUCATION ??
      extractContextSections(llmText, ["education"], sections).education;
    const skillsText =
      sections?.SKILLS ?? extractContextSections(llmText, ["skills"], sections).skills;

    if (!result.experience.length && experienceText) {
      const r = await runPassWithRetry(
        2,
        SECTION_EXPERIENCE_PROMPT,
        experienceText.slice(0, 6000),
        resumeId,
        tenantId
      );
      if (r.parsed && Array.isArray((r.parsed as { experience?: unknown }).experience)) {
        result = {
          ...result,
          experience: (r.parsed as { experience: ExtractionResumeSchemaType["experience"] })
            .experience,
        };
      }
    }

    if (!result.education.length && educationText) {
      const r = await runPassWithRetry(
        2,
        SECTION_EDUCATION_PROMPT,
        educationText.slice(0, 4000),
        resumeId,
        tenantId
      );
      if (r.parsed && Array.isArray((r.parsed as { education?: unknown }).education)) {
        result = {
          ...result,
          education: (r.parsed as { education: ExtractionResumeSchemaType["education"] }).education,
        };
      }
    }

    if (result.skills.length < 3 && skillsText) {
      const r = await runPassWithRetry(
        2,
        SECTION_SKILLS_PROMPT,
        skillsText.slice(0, 4000),
        resumeId,
        tenantId
      );
      if (r.parsed && Array.isArray((r.parsed as { skills?: unknown }).skills)) {
        result = {
          ...result,
          skills: (r.parsed as { skills: ExtractionResumeSchemaType["skills"] }).skills,
        };
      }
    }

    if (isSparseExtraction(result, rawText)) {
      result = enrichSparseExtraction(result, rawText, sections);
    }

    return result;
  }

  async extract(
    rawText: string,
    _fileBytes: Buffer,
    opts?: {
      resumeId?: string;
      tenantId?: string;
      sections?: Partial<Record<SectionType, string>>;
      formatType?: FormatType;
      /** A/B test override for pass-1 system prompt. */
      promptOverride?: string;
    }
  ): Promise<ExtractionParseResult> {
    const resumeId = opts?.resumeId;
    const tenantId = opts?.tenantId ?? null;
    const threshold = env.CONFIDENCE_THRESHOLD;
    const maxPasses = env.EXTRACTION_FAST_MODE ? 1 : env.OLLAMA_EXTRACTION_MAX_PASSES;
    const llmText = truncateResumeForLlm(rawText);
    const passesRun: (1 | 2 | 3)[] = [];

    passesRun.push(1);
    const pass1Prompt = opts?.promptOverride ?? BROAD_EXTRACTION_PROMPT;
    const pass1Result = await runPassWithRetry(
      1,
      pass1Prompt,
      `RESUME TEXT:\n${llmText}`,
      resumeId,
      tenantId
    );

    if (pass1Result.parsed) {
      const schema = pass1Result.parsed as ExtractionResumeSchemaType;
      logExtractionEvent({
        event: "pass1_complete",
        resume_id: resumeId ?? "unknown",
        tenant_id: tenantId,
        pass_number: 1,
        duration_ms: pass1Result.durationMs,
        confidence: schema.field_confidence
          ? Object.values(schema.field_confidence).reduce((a, b) => a + b, 0) /
            Object.values(schema.field_confidence).length
          : null,
        field_count: fieldCountFromSchema(schema as unknown as Record<string, unknown>),
        error: null,
      });
      MetricsCollector.record("pass1_complete", { duration_ms: pass1Result.durationMs });
    }

    if (!pass1Result.parsed) {
      return {
        schema: emptyExtractionSchema(),
        parseConfidence: 0,
        issues: [`Pass 1 failed: ${pass1Result.error}`],
        flags: ["PARSE_FAILED"],
        passesRun,
        extractionModel: env.OLLAMA_EXTRACTION_MODEL,
      };
    }

    let merged = pass1Result.parsed as ExtractionResumeSchemaType;
    const sparseAfterPass1 = isSparseExtraction(merged, rawText);

    if (sparseAfterPass1) {
      console.warn(
        `[extractor] Sparse pass-1 for resume ${resumeId ?? "unknown"} — running section retries`
      );
      merged = await this.runSectionRetries(merged, rawText, llmText, opts?.sections, resumeId, tenantId);
    }

    const lowFields = getLowConfidenceFields(merged.field_confidence ?? {}, threshold);

    if ((maxPasses >= 2 && lowFields.length > 0) || (sparseAfterPass1 && maxPasses < 2)) {
      passesRun.push(2);
      logExtractionEvent({
        event: "pass2_triggered",
        resume_id: resumeId ?? "unknown",
        tenant_id: tenantId,
        pass_number: 2,
        duration_ms: null,
        confidence: null,
        field_count: lowFields.length,
        error: null,
        metadata: { low_fields: lowFields },
      });
      MetricsCollector.record("pass2_triggered");

      const contextSections = extractContextSections(
        llmText,
        lowFields,
        opts?.sections
      );
      const industry =
        opts?.formatType === "INTERNATIONAL"
          ? "GENERAL"
          : (merged.industryDomain as Industry);
      const fewShots = getFewShots(industry, 3);

      const pass2Result = await runPassWithRetry(
        2,
        "You are a targeted resume field extractor. Extract ONLY the specified fields.",
        `${GAP_FILL_PROMPT(lowFields, contextSections, fewShots)}\n\nRESUME TEXT:\n${llmText}`,
        resumeId,
        tenantId
      );

      if (pass2Result.parsed) {
        merged = mergePassResults(
          merged,
          pass2Result.parsed as Partial<ExtractionResumeSchemaType>,
          lowFields
        );
      }
    }

    merged = enrichSparseExtraction(merged, rawText, opts?.sections);

    const stillSparse = isSparseExtraction(merged, rawText);
    let pass3Changed = false;
    const prePass3Snapshot = JSON.stringify(merged);

    // Pass 3 (self-critique) always runs when MAX_PASSES >= 3; sparse resumes may trigger it earlier.
    const runPass3 = maxPasses >= 3 || (stillSparse && maxPasses >= 2);
    if (runPass3) {
      if (!passesRun.includes(3)) passesRun.push(3);
      const pass3Result = await runPassWithRetry(
        3,
        SELF_CRITIQUE_PROMPT,
        `SOURCE TEXT:\n${llmText}\n\nCURRENT JSON:\n${JSON.stringify(merged, null, 2)}`,
        resumeId,
        tenantId
      );

      if (pass3Result.parsed) {
        const validated = ExtractionResumeSchema.safeParse(pass3Result.parsed);
        merged = validated.success
          ? validated.data
          : ({ ...merged, ...(pass3Result.parsed as Partial<ExtractionResumeSchemaType>) } as ExtractionResumeSchemaType);
      }
      merged = enrichSparseExtraction(merged, rawText, opts?.sections);
      pass3Changed = JSON.stringify(merged) !== prePass3Snapshot;
    }

    const { resume, issues, flags, parseConfidence } = CrossFieldValidator.validate(merged);

    if (passesRun.includes(3)) {
      logExtractionEvent({
        event: "pass3_complete",
        resume_id: resumeId ?? "unknown",
        tenant_id: tenantId,
        pass_number: 3,
        duration_ms: null,
        confidence: parseConfidence,
        field_count: fieldCountFromSchema(resume as unknown as Record<string, unknown>),
        error: null,
        metadata: { pass3_corrected: pass3Changed },
      });
      MetricsCollector.record("pass3_complete", {
        pass3_corrected: pass3Changed,
        confidence: parseConfidence,
      });
    }

    return {
      schema: resume,
      parseConfidence,
      issues,
      flags,
      passesRun,
      extractionModel: env.OLLAMA_EXTRACTION_MODEL,
      pass3Changed,
    };
  }
}

const defaultExtractor = new MultiPassExtractor();

export async function parseResumeMultiPass(
  text: string,
  fileBytes?: Buffer,
  resumeId?: string
): Promise<ParseResult> {
  const result = await defaultExtractor.extract(text, fileBytes ?? Buffer.alloc(0), {
    resumeId,
  });
  return wrapExtractionResult(result);
}

export async function generateImprovements(ui: ParsedResumeUI): Promise<unknown[]> {
  try {
    const content = await ollamaChat(IMPROVEMENTS_PROMPT, JSON.stringify(ui, null, 2));
    const obj = parseJsonFromModel(content) as { improvements?: unknown[] };
    return obj.improvements ?? [];
  } catch (e) {
    console.error("[extractor] improvements error:", e);
    return [];
  }
}

/** @deprecated Pass 1 only — use MultiPassExtractor */
export async function extractResumePass1(text: string): Promise<ResumeSchemaType> {
  const result = await parseResumeMultiPass(text);
  return result.resume;
}

/** @deprecated Pass 2 only — use MultiPassExtractor */
export async function extractResumePass2(
  text: string,
  partial: ResumeSchemaType,
  _lowFields: string[]
): Promise<ResumeSchemaType> {
  void partial;
  const result = await parseResumeMultiPass(text);
  return result.resume;
}
