/** Strip markdown fences, Qwen thinking blocks, and parse JSON from model output. */
export function parseJsonFromModel(content: string): unknown {
  let cleaned = content.trim();

  // Qwen3 / reasoning models: drop thinking blocks before JSON
  cleaned = cleaned.replace(/[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/[\s\S]*?<\/redacted_reasoning>/gi, "").trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("No JSON object found in model output");
  }
}
