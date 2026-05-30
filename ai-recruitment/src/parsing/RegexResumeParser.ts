import { emptyExtractionSchema, type ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import { SectionDetector } from "@/parsing/SectionDetector";
import { enrichSparseExtraction } from "@/parsing/heuristic-enricher";
import type { SectionType } from "@/parsing/preprocess.types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\d{10,12}\b/;

/**
 * Fast regex/heuristic parser — no Ollama calls.
 * Used when LLM extraction fails or EXTRACTION_FAST_MODE regex bypass.
 */
export class RegexResumeParser {
  static parse(
    rawText: string,
    sections?: Partial<Record<SectionType, string>>
  ): ExtractionResumeSchemaType {
    const detected = sections ?? SectionDetector.detect(rawText);
    let schema = emptyExtractionSchema();
    schema = enrichSparseExtraction(schema, rawText, detected);

    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (!schema.personalInfo.name?.trim() && lines[0]) {
      const first = lines[0];
      if (
        first.length >= 3 &&
        first.length <= 60 &&
        !EMAIL_RE.test(first) &&
        !PHONE_RE.test(first)
      ) {
        schema.personalInfo.name = first;
      }
    }

    if (!schema.personalInfo.email?.trim()) {
      schema.personalInfo.email = rawText.match(EMAIL_RE)?.[0] ?? null;
    }

    if (!schema.personalInfo.phone?.trim()) {
      schema.personalInfo.phone = rawText.match(PHONE_RE)?.[0]?.replace(/\s/g, "") ?? null;
    }

    schema.field_confidence = {
      personalInfo: schema.personalInfo.name ? 0.65 : 0.4,
      skills: schema.skills.length ? 0.6 : 0.35,
      experience: schema.experience.length ? 0.6 : 0.35,
      education: schema.education.length ? 0.55 : 0.3,
      summary: schema.summary ? 0.55 : 0.3,
    };

    if (schema.experience.length) {
      schema.yearsOfExperience = Math.min(schema.experience.length * 2, 20);
    }

    return schema;
  }
}
