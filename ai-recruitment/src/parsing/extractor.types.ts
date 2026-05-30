import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";

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
