import { getPipelineEnv } from "@/config/pipeline-env";
import {
  DocumentExtractor,
  normalizeText,
} from "@/parsing/document-extractor";
import { PIIMasker } from "@/parsing/pii";
import type {
  FormatType,
  PreprocessResult,
  SectionType,
} from "@/parsing/preprocess.types";
import { SectionDetector } from "@/parsing/section-detector";
import { BlobStorage } from "@/storage/blob";

function detectContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    rtf: "application/rtf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

export function classifyFormat(
  text: string,
  sections: Partial<Record<SectionType, string>>
): FormatType {
  const lower = text.toLowerCase();

  if (
    lower.includes("curriculum vitae") ||
    /\bcv\b/.test(lower) ||
    lower.includes("vitae")
  ) {
    return "INTERNATIONAL";
  }

  if (
    lower.includes("publication") ||
    lower.includes("peer-reviewed") ||
    lower.includes("research") ||
    lower.includes("teaching experience")
  ) {
    return "ACADEMIC";
  }

  const sectionKeys = Object.keys(sections);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (sections.SKILLS && !sections.EXPERIENCE && sectionKeys.length <= 4) {
    return "FUNCTIONAL";
  }

  if (sectionKeys.length >= 3 && wordCount >= 80) {
    return "STANDARD";
  }

  if (wordCount < 180 || sectionKeys.length <= 2) {
    return "CREATIVE";
  }

  return "STANDARD";
}

export interface PreprocessOptions {
  skipBlobUpload?: boolean;
  maskPii?: boolean;
}

export class ResumePreprocessor {
  async process(
    fileBytes: Buffer,
    filename: string,
    userId: string,
    resumeId: string,
    options: PreprocessOptions = {}
  ): Promise<PreprocessResult> {
    const mimeType = detectContentType(filename);
    const extracted = await DocumentExtractor.extract(fileBytes, filename, mimeType);
    const rawText = normalizeText(extracted.text);
    const sections = SectionDetector.detect(rawText);
    const formatType = classifyFormat(rawText, sections);

    const shouldMask = options.maskPii !== false;
    const { maskedText, piiMask } = shouldMask
      ? PIIMasker.mask(rawText)
      : { maskedText: rawText, piiMask: {} };

    let blobPath = "";
    let blobUrl = "";

    if (!options.skipBlobUpload) {
      const uploaded = await BlobStorage.upload(
        fileBytes,
        filename,
        userId,
        resumeId,
        mimeType
      );
      blobPath = uploaded.blobPath;
      blobUrl = uploaded.blobUrl;
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;

    return {
      resumeId,
      rawText,
      maskedText,
      sections,
      formatType,
      parsingMethod: extracted.parsingMethod,
      piiMask,
      wordCount,
      blobUrl,
      blobPath,
      metadata: {
        filename,
        mimeType,
        enableOcr: getPipelineEnv().ENABLE_OCR,
      },
    };
  }
}

/** Backward-compatible helper without blob upload. */
export async function preprocessResumeFile(
  buffer: Buffer,
  mimeType: string,
  maskPii = true
): Promise<{
  rawText: string;
  maskedText: string;
  piiRedacted: boolean;
  sections: Partial<Record<SectionType, string>>;
  formatType: FormatType;
  parsingMethod: PreprocessResult["parsingMethod"];
  piiMask: PreprocessResult["piiMask"];
}> {
  const preprocessor = new ResumePreprocessor();
  const filename =
    mimeType.includes("pdf")
      ? "resume.pdf"
      : mimeType.includes("word")
        ? "resume.docx"
        : "resume.txt";

  const result = await preprocessor.process(buffer, filename, "local", "local", {
    skipBlobUpload: true,
    maskPii,
  });

  return {
    rawText: result.rawText,
    maskedText: result.maskedText,
    piiRedacted: result.maskedText !== result.rawText,
    sections: result.sections,
    formatType: result.formatType,
    parsingMethod: result.parsingMethod,
    piiMask: result.piiMask,
  };
}
