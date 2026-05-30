import { ollamaChat } from "@/lib/ollama-client";
import {
  extractionToLegacy,
  extractionToUI,
} from "@/models/adapters/extraction-adapter";
import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";
import type { ResumeSchemaType } from "@/models/resume.schema";
import { IMPROVEMENTS_PROMPT } from "@/parsing/prompts";
import { parseJsonFromModel } from "@/parsing/json-from-model";
import { ResumeParser, defaultResumeParser } from "@/parsing/ResumeParser";
import type { ExtractionParseResult } from "@/parsing/extractor.types";

export type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
export type { ExtractionParseResult } from "@/parsing/extractor.types";

/** Pipeline / API result with legacy schema + UI adapter. */
export interface ParseResult {
  resume: ResumeSchemaType;
  ui: ParsedResumeUI;
  schema: ExtractionParseResult["schema"];
  parseConfidence: number;
  issues: string[];
  flags: string[];
  passesRun: (1 | 2 | 3)[];
  extractionModel: string;
  passCount: number;
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

/** @deprecated Use ResumeParser — kept for backward compatibility */
export class MultiPassExtractor {
  private parser = defaultResumeParser;

  async extract(
    rawText: string,
    _fileBytes: Buffer,
    opts?: Parameters<ResumeParser["parse"]>[1]
  ): Promise<ExtractionParseResult> {
    return this.parser.parse(rawText, { ...opts, rawText });
  }
}

const defaultExtractor = new MultiPassExtractor();

export async function parseResumeMultiPass(
  text: string,
  fileBytes?: Buffer,
  resumeId?: string
): Promise<ParseResult> {
  void fileBytes;
  const result = await defaultExtractor.extract(text, Buffer.alloc(0), { resumeId });
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

/** @deprecated Pass 1 only — use ResumeParser */
export async function extractResumePass1(text: string): Promise<ResumeSchemaType> {
  const result = await parseResumeMultiPass(text);
  return result.resume;
}

/** @deprecated Pass 2 only — use ResumeParser */
export async function extractResumePass2(
  text: string,
  partial: ResumeSchemaType,
  _lowFields: string[]
): Promise<ResumeSchemaType> {
  void partial;
  const result = await parseResumeMultiPass(text);
  return result.resume;
}
