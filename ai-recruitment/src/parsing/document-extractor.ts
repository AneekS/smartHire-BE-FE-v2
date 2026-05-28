import { getPipelineEnv } from "@/config/pipeline-env";
import mammoth from "mammoth";
import type { DocumentExtractResult, ParsingMethod } from "@/parsing/preprocess.types";

const MIN_TEXT_LAYER_CHARS = 100;
const OCR_SCALE = 2; // ~144 DPI base → ~288 DPI render

function detectMime(buffer: Buffer, filename: string): string {
  if (buffer.slice(0, 4).toString() === "%PDF") return "application/pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (buffer.slice(0, 5).toString() === "{\\rtf") return "application/rtf";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (
    buffer.slice(0, 4).toString() === "II*\0" ||
    buffer.slice(0, 4).toString() === "MM\0*"
  ) {
    return "image/tiff";
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  const extMap: Record<string, string> = {
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
  return extMap[ext ?? ""] ?? "application/octet-stream";
}

function stripRtf(content: string): string {
  return content
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\line/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, (m) =>
      String.fromCharCode(parseInt(m.slice(2), 16))
    )
    .replace(/\\[a-z]+\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Detect 2-column layout and reflow left-to-right. */
export function reflowTwoColumns(text: string): { text: string; applied: boolean } {
  const lines = text.split("\n");
  const twoColLines = lines.filter((line) => {
    const match = line.match(/^(.{5,}?)\s{10,}(.{5,})$/);
    return Boolean(match);
  });

  if (twoColLines.length < Math.max(3, lines.length * 0.15)) {
    return { text, applied: false };
  }

  const left: string[] = [];
  const right: string[] = [];
  for (const line of lines) {
    const match = line.match(/^(.{5,}?)\s{10,}(.{5,})$/);
    if (match) {
      left.push(match[1].trim());
      right.push(match[2].trim());
    } else if (line.trim()) {
      left.push(line.trim());
    }
  }

  return {
    text: [...left, "", ...right].join("\n"),
    applied: true,
  };
}

export function normalizeText(text: string): string {
  let out = text
    .replace(/\r\n/g, "\n")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2014/g, " — ")
    .replace(/\u2013/g, " - ")
    .replace(/[^\S\n]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  const pages = out.split("\f");
  if (pages.length > 1) {
    const lineCounts = new Map<string, number>();
    for (const page of pages) {
      for (const line of page.split("\n")) {
        const key = line.trim();
        if (key.length >= 5 && key.length <= 80) {
          lineCounts.set(key, (lineCounts.get(key) ?? 0) + 1);
        }
      }
    }
    const repeated = new Set(
      [...lineCounts.entries()].filter(([, c]) => c >= 2).map(([k]) => k)
    );
    out = pages
      .map((page) =>
        page
          .split("\n")
          .filter((line) => !repeated.has(line.trim()))
          .join("\n")
      )
      .join("\n");
  }

  return out
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

async function ocrImageBuffer(buffer: Buffer, lang: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang);
  try {
    const { data } = await worker.recognize(buffer, {}, { text: true });
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

async function ocrPdfPages(buffer: Buffer, lang: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createWorker } = await import("tesseract.js");
  const { createCanvas } = await import("@napi-rs/canvas");

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const worker = await createWorker(lang);
  const parts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const { data } = await worker.recognize(pngBuffer, {}, { text: true });
      if (data.text?.trim()) parts.push(data.text.trim());
    }
  } finally {
    await worker.terminate();
  }

  return parts.join("\n\n");
}

async function extractPdfText(buffer: Buffer): Promise<DocumentExtractResult> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    let text = result?.text ?? "";
    let parsingMethod: ParsingMethod = "text_layer";

    if (text.trim().length < MIN_TEXT_LAYER_CHARS) {
      const env = getPipelineEnv();
      if (!env.ENABLE_OCR) {
        throw new Error(
          "PDF appears to be scanned/image-based. Enable ENABLE_OCR=true for OCR fallback."
        );
      }
      text = await ocrPdfPages(buffer, env.TESSERACT_LANG);
      parsingMethod = "ocr";
    }

    const reflowed = reflowTwoColumns(text);
    text = reflowed.text;
    if (reflowed.applied && parsingMethod === "ocr") {
      parsingMethod = "ocr_2col";
    } else if (reflowed.applied) {
      parsingMethod = "ocr_2col";
    }

    if (!text.trim()) {
      throw new Error("PDF appears to be empty or unreadable");
    }

    return { text, parsingMethod };
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<DocumentExtractResult> {
  const htmlResult = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "b => strong",
      ],
    }
  );

  const rawResult = await mammoth.extractRawText({ buffer });
  let text = rawResult.value ?? "";

  if (htmlResult.value) {
    const withHeadings = htmlResult.value
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "## $1\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
      .replace(/<strong>(.*?)<\/strong>/gi, "## $1\n")
      .replace(/<tr>/gi, "\n")
      .replace(/<\/tr>/gi, "")
      .replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, "$1 | ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+\n/g, "\n")
      .trim();

    if (withHeadings.length > text.length * 0.8) {
      text = withHeadings;
    }
  }

  if (!text.trim()) throw new Error("DOCX appears to be empty");
  return { text, parsingMethod: "text_layer" };
}

async function extractRtfText(buffer: Buffer): Promise<DocumentExtractResult> {
  const text = stripRtf(buffer.toString("utf8"));
  if (!text.trim()) throw new Error("RTF appears to be empty");
  return { text, parsingMethod: "text_layer" };
}

async function extractImageText(buffer: Buffer): Promise<DocumentExtractResult> {
  const env = getPipelineEnv();
  if (!env.ENABLE_OCR) {
    throw new Error("Image upload requires ENABLE_OCR=true");
  }
  const text = await ocrImageBuffer(buffer, env.TESSERACT_LANG);
  if (!text.trim()) throw new Error("Image OCR returned no text");
  return { text, parsingMethod: "ocr" };
}

export class DocumentExtractor {
  static async extract(
    buffer: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<DocumentExtractResult> {
    const mime = mimeType ?? detectMime(buffer, filename);

    try {
      if (mime === "application/pdf" || mime.includes("pdf")) {
        return await extractPdfText(buffer);
      }

      if (
        mime.includes("word") ||
        mime.includes("document") ||
        mime ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        return await extractDocxText(buffer);
      }

      if (mime === "application/rtf") {
        return await extractRtfText(buffer);
      }

      if (mime.startsWith("image/")) {
        return await extractImageText(buffer);
      }

      try {
        return await extractPdfText(buffer);
      } catch {
        return await extractDocxText(buffer);
      }
    } catch (error) {
      throw new Error(
        `Document extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/** @deprecated Use DocumentExtractor.extract */
export class ExtractorService {
  static async extract(buffer: Buffer, mimeType: string): Promise<string> {
    const result = await DocumentExtractor.extract(buffer, "file", mimeType);
    return normalizeText(result.text);
  }
}
