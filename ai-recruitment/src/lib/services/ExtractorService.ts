import mammoth from 'mammoth';

export class ExtractorService {
    static async extract(buffer: Buffer, mimeType: string): Promise<string> {
        try {
            if (
                mimeType === 'application/pdf' ||
                mimeType === 'application/octet-stream' ||
                mimeType.includes("pdf")
            ) {
                return await ExtractorService.extractFromPDF(buffer);
            }

            if (
                mimeType ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mimeType === 'application/msword' ||
                mimeType.includes("word") ||
                mimeType.includes("document")
            ) {
                return await ExtractorService.extractFromDOCX(buffer);
            }

            // Fallback: try PDF first, then DOCX
            try {
                return await ExtractorService.extractFromPDF(buffer);
            } catch {
                return await ExtractorService.extractFromDOCX(buffer);
            }
        } catch (error) {
            console.error('ExtractorService error:', error);
            throw new Error(`Failed to extract text: ${error}`);
        }
    }

    private static async extractFromPDF(buffer: Buffer): Promise<string> {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            const rawText = result?.text ?? '';
            // DEBUG: Log extraction result so we can see if content is truncated
            const numPages = (result as { numpages?: number }).numpages;
            console.log('[ExtractorService] PDF extract:', {
                rawTextLength: rawText.length,
                numpages: numPages ?? 'unknown',
                previewStart: rawText.slice(0, 200).replace(/\n/g, ' '),
                previewEnd: rawText.length > 400 ? rawText.slice(-200).replace(/\n/g, ' ') : '(short)',
            });
            if (!rawText || rawText.trim().length === 0) {
                throw new Error('PDF appears to be empty or image-based (no extractable text)');
            }
            return rawText;
        } finally {
            await parser.destroy();
        }
    }

    private static async extractFromDOCX(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value || result.value.trim().length === 0) {
            throw new Error('DOCX appears to be empty');
        }
        return result.value;
    }
}
