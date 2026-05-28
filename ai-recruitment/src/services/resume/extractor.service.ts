/**
 * @deprecated Use DocumentExtractor from @/parsing/document-extractor
 */
export {
  DocumentExtractor,
  normalizeText,
} from "@/parsing/document-extractor";

import { DocumentExtractor, normalizeText } from "@/parsing/document-extractor";

export class ExtractorService {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    const result = await DocumentExtractor.extract(buffer, "file", mimeType);
    return normalizeText(result.text);
  }

  chunkText(text: string, maxTokens: number = 3000): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    const start = text.substring(0, maxChars * 0.7);
    const end = text.substring(text.length - maxChars * 0.3);
    return `${start}\n...[truncated]...\n${end}`;
  }
}
