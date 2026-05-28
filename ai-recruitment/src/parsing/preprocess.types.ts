export type SectionType =
  | "SUMMARY"
  | "EXPERIENCE"
  | "SKILLS"
  | "EDUCATION"
  | "CERTIFICATIONS"
  | "ACHIEVEMENTS"
  | "OTHER";

export type FormatType =
  | "STANDARD"
  | "FUNCTIONAL"
  | "CREATIVE"
  | "ACADEMIC"
  | "INTERNATIONAL";

export type ParsingMethod = "text_layer" | "ocr" | "ocr_2col";

export interface PIIMask {
  email?: string;
  phone?: string;
  ssn?: string;
  dob?: string;
  linkedIn?: string;
  github?: string;
}

export interface PreprocessResult {
  resumeId: string;
  rawText: string;
  maskedText: string;
  sections: Partial<Record<SectionType, string>>;
  formatType: FormatType;
  parsingMethod: ParsingMethod;
  piiMask: PIIMask;
  wordCount: number;
  blobUrl: string;
  blobPath: string;
  metadata: Record<string, unknown>;
}

export interface DocumentExtractResult {
  text: string;
  parsingMethod: ParsingMethod;
}
