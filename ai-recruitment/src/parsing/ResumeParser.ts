import { env } from "@/config/pipeline-env";
import { OllamaExtractError } from "@/parsing/extraction-pass-utils";
import { emptyExtractionSchema, type ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import { Pass1BroadExtractor } from "@/parsing/Pass1BroadExtractor";
import { Pass2GapFiller, shouldRunPass2 } from "@/parsing/Pass2GapFiller";
import { Pass3SelfCritique, shouldRunPass3 } from "@/parsing/Pass3SelfCritique";
import { RegexResumeParser } from "@/parsing/RegexResumeParser";
import { enrichSparseExtraction } from "@/parsing/heuristic-enricher";
import { isSparseExtraction } from "@/parsing/extraction-quality";
import { truncateResumeForLlm } from "@/parsing/truncate-for-llm";
import {
  SECTION_EDUCATION_PROMPT,
  SECTION_EXPERIENCE_PROMPT,
  SECTION_SKILLS_PROMPT,
} from "@/parsing/prompts";
import { runPassWithRetry } from "@/parsing/extraction-pass-utils";
import { sectionsToExtractorContext } from "@/parsing/section-detector";
import type { FormatType, SectionType } from "@/parsing/preprocess.types";
import { CrossFieldValidator } from "@/parsing/validator";
import type { ExtractionParseResult } from "@/parsing/extractor.types";

export interface ResumeParserOptions {
  resumeId?: string;
  tenantId?: string;
  sections?: Partial<Record<SectionType, string>>;
  formatType?: FormatType;
  promptOverride?: string;
  rawText?: string;
}

export class ResumeParser {
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
      sectionsToExtractorContext(sections ?? {}, ["experience"]).experience;
    const educationText =
      sections?.EDUCATION ??
      sectionsToExtractorContext(sections ?? {}, ["education"]).education;
    const skillsText =
      sections?.SKILLS ?? sectionsToExtractorContext(sections ?? {}, ["skills"]).skills;

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

  async parse(maskedText: string, opts: ResumeParserOptions = {}): Promise<ExtractionParseResult> {
    const resumeId = opts.resumeId;
    const tenantId = opts.tenantId ?? null;
    const rawText = opts.rawText ?? maskedText;
    const maxPasses = env.EXTRACTION_FAST_MODE ? 1 : env.OLLAMA_EXTRACTION_MAX_PASSES;
    const llmText = truncateResumeForLlm(maskedText);
    const passesRun: (1 | 2 | 3)[] = [];

    if (env.EXTRACTION_FAST_MODE) {
      const regexSchema = RegexResumeParser.parse(rawText, opts.sections);
      const validated = CrossFieldValidator.validate(regexSchema);
      return {
        schema: validated.resume,
        parseConfidence: validated.parseConfidence,
        issues: validated.issues,
        flags: [...validated.flags, "REGEX_FALLBACK"],
        passesRun: [],
        extractionModel: "regex",
      };
    }

    try {
      passesRun.push(1);
      const pass1 = await Pass1BroadExtractor.run(llmText, {
        resumeId,
        tenantId,
        promptOverride: opts.promptOverride,
      });

      if (!pass1.schema) {
        const regexSchema = RegexResumeParser.parse(rawText, opts.sections);
        const validated = CrossFieldValidator.validate(regexSchema);
        return {
          schema: validated.resume,
          parseConfidence: validated.parseConfidence,
          issues: [`Pass 1 failed: ${pass1.error}`, ...validated.issues],
          flags: [...validated.flags, "REGEX_FALLBACK", "PARSE_FAILED"],
          passesRun,
          extractionModel: env.OLLAMA_EXTRACTION_MODEL,
        };
      }

      let merged = pass1.schema;
      if (isSparseExtraction(merged, rawText)) {
        merged = await this.runSectionRetries(
          merged,
          rawText,
          llmText,
          opts.sections,
          resumeId,
          tenantId
        );
      }

      if (maxPasses >= 2 && shouldRunPass2(merged)) {
        passesRun.push(2);
        merged = await Pass2GapFiller.run(merged, llmText, {
          resumeId,
          tenantId,
          sections: opts.sections,
          formatType: opts.formatType,
        });
      }

      merged = enrichSparseExtraction(merged, rawText, opts.sections);

      let pass3Changed = false;
      if (maxPasses >= 3 && shouldRunPass3(merged)) {
        passesRun.push(3);
        const pass3 = await Pass3SelfCritique.run(merged, llmText, { resumeId, tenantId });
        merged = enrichSparseExtraction(pass3.schema, rawText, opts.sections);
        pass3Changed = pass3.changed;
        Pass3SelfCritique.logComplete(merged, pass3Changed, { resumeId, tenantId });
      }

      const { resume, issues, flags, parseConfidence } = CrossFieldValidator.validate(merged);

      return {
        schema: resume,
        parseConfidence,
        issues,
        flags,
        passesRun,
        extractionModel: env.OLLAMA_EXTRACTION_MODEL,
        pass3Changed,
      };
    } catch (err) {
      if (err instanceof OllamaExtractError) {
        const regexSchema = RegexResumeParser.parse(rawText, opts.sections);
        const validated = CrossFieldValidator.validate(regexSchema);
        return {
          schema: validated.resume,
          parseConfidence: validated.parseConfidence,
          issues: [`Ollama error: ${err.message}`, ...validated.issues],
          flags: [...validated.flags, "REGEX_FALLBACK"],
          passesRun,
          extractionModel: env.OLLAMA_EXTRACTION_MODEL,
        };
      }
      throw err;
    }
  }
}

export const defaultResumeParser = new ResumeParser();
