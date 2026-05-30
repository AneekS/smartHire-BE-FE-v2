import { PromptInjectionSanitizer } from "@/parsing/PromptInjectionSanitizer";

const HTML_TAG_RE = /<[^>]*>/g;
const PATH_TRAVERSAL_RE = /(\.\.[\\/\\])|([\\/\\]\.\.)|(%2e%2e)|(%252e%252e)/i;

export class InputSanitizer {
  static sanitizeString(input: string, options?: { maxLength?: number }): string {
    const maxLength = options?.maxLength ?? 10_000;
    return input.trim().slice(0, maxLength);
  }

  static sanitizeFilename(name: string): string {
    const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    return base || "file";
  }

  static sanitizePromptInput(text: string): string {
    return PromptInjectionSanitizer.sanitize(text);
  }

  static detectPathTraversal(path: string): boolean {
    return PATH_TRAVERSAL_RE.test(path);
  }

  static stripHtml(input: string): string {
    return input.replace(HTML_TAG_RE, "");
  }
}
