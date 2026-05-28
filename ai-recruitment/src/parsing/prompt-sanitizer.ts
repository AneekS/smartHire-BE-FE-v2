/** Patterns that may manipulate LLM behavior when embedded in resume text. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?\s*:/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|system\|>/gi,
  /<\|assistant\|>/gi,
  /<\|user\|>/gi,
  /###\s*instruction/gi,
  /###\s*system/gi,
  /<\s*script[\s>]/gi,
];

const REPLACEMENT = "[removed]";

/**
 * Strip common prompt-injection phrases from resume text before sending to Ollama.
 */
export function sanitizePromptInjection(text: string): string {
  let out = text;
  for (const pattern of INJECTION_PATTERNS) {
    out = out.replace(pattern, REPLACEMENT);
  }
  return out.replace(/\n{4,}/g, "\n\n\n").trim();
}
