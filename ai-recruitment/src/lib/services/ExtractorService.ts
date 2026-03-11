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
        // Dynamically import pdf-parse to avoid any module resolution issues with Turbopack/Webpack
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            if (!result.text || result.text.trim().length === 0) {
                throw new Error('PDF appears to be empty or image-based (no extractable text)');
            }
            return result.text;
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
