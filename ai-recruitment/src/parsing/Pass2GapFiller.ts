import { PASS2_CONFIDENCE_THRESHOLD } from "@/parsing/constants";
import { GAP_FILL_PROMPT } from "@/parsing/prompts";
import {
  getLowConfidenceFields,
  hasMissingRequiredFields,
  mergePassResults,
  runPassWithRetry,
  averageConfidence,
} from "@/parsing/extraction-pass-utils";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import { getFewShots, type Industry } from "@/parsing/few-shots";
import { sectionsToExtractorContext } from "@/parsing/section-detector";
import type { FormatType, SectionType } from "@/parsing/preprocess.types";
import { logExtractionEvent } from "@/monitoring/logger";
import { MetricsCollector } from "@/monitoring/metrics";

export { shouldRunPass2 } from "@/parsing/pass-triggers";

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

export class Pass2GapFiller {
  static async run(
    merged: ExtractionResumeSchemaType,
    llmText: string,
    opts: {
      resumeId?: string;
      tenantId?: string | null;
      sections?: Partial<Record<SectionType, string>>;
      formatType?: FormatType;
    } = {}
  ): Promise<ExtractionResumeSchemaType> {
    let lowFields = getLowConfidenceFields(
      merged.field_confidence ?? {},
      PASS2_CONFIDENCE_THRESHOLD
    );

    if (hasMissingRequiredFields(merged)) {
      for (const field of ["personalInfo", "skills", "experience"]) {
        if (!lowFields.includes(field)) lowFields.push(field);
      }
    }

    logExtractionEvent({
      event: "pass2_triggered",
      resume_id: opts.resumeId ?? "unknown",
      tenant_id: opts.tenantId ?? null,
      pass_number: 2,
      duration_ms: null,
      confidence: averageConfidence(merged.field_confidence ?? {}),
      field_count: lowFields.length,
      error: null,
      metadata: { low_fields: lowFields },
    });
    MetricsCollector.record("pass2_triggered");

    const contextSections = extractContextSections(llmText, lowFields, opts.sections);
    const industry =
      opts.formatType === "INTERNATIONAL" ? "GENERAL" : (merged.industryDomain as Industry);
    const fewShots = getFewShots(industry, 3);

    const pass2Result = await runPassWithRetry(
      2,
      "You are a targeted resume field extractor. Extract ONLY the specified fields.",
      `${GAP_FILL_PROMPT(lowFields, contextSections, fewShots)}\n\nRESUME TEXT:\n${llmText}`,
      opts.resumeId,
      opts.tenantId
    );

    if (pass2Result.parsed) {
      return mergePassResults(
        merged,
        pass2Result.parsed as Partial<ExtractionResumeSchemaType>,
        lowFields
      );
    }

    return merged;
  }
}
