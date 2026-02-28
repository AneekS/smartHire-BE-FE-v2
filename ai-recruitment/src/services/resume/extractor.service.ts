import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class ExtractorService {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          return this.cleanText(result.text);
        } finally {
          await parser.destroy();
        }
      }

      if (
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({ buffer });
        return this.cleanText(result.value);
      }

      throw new Error(`Unsupported file type: ${mimeType}`);
    } catch (error) {
      throw new Error(
        `Text extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\n]{2,}/g, " ")
      .replace(/[^\x20-\x7E\n]/g, " ")
      .trim();
  }

  chunkText(text: string, maxTokens: number = 3000): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    const start = text.substring(0, maxChars * 0.7);
    const end = text.substring(text.length - maxChars * 0.3);
    return `${start}\n...[truncated]...\n${end}`;
  }
}
