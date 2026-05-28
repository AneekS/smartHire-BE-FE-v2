/**
 * @deprecated Use `@/parsing/extractor` and `@/models/adapters/resume-ui.adapter` instead.
 */
export {
  type ParsedResume,
  type ParsedResumeUI,
  resumeSchemaToUI,
  uiToResumeSchema,
} from "@/models/adapters/resume-ui.adapter";

export {
  generateImprovements,
  parseResumeMultiPass,
  MultiPassExtractor,
  wrapExtractionResult,
} from "@/parsing/extractor";

import { MultiPassExtractor, generateImprovements, wrapExtractionResult } from "@/parsing/extractor";

const extractor = new MultiPassExtractor();

export class ParserService {
  static async parse(rawText: string, fileBytes: Buffer, resumeId?: string) {
    const result = await extractor.extract(rawText, fileBytes, { resumeId });
    return wrapExtractionResult(result);
  }

  async parseResume(rawText: string, fileBytes?: Buffer, resumeId?: string) {
    const result = await ParserService.parse(rawText, fileBytes ?? Buffer.alloc(0), resumeId);
    return result.ui;
  }

  async generateImprovements(
    parsed: import("@/models/adapters/resume-ui.adapter").ParsedResumeUI
  ) {
    return generateImprovements(parsed);
  }
}
