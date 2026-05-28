/**
 * Quick Ollama connectivity check (all pool nodes).
 * Usage: npm run ollama:ping
 */
import { config } from "dotenv";
import {
  assertSupportedOllamaModel,
  OLLAMA_EMBED_MODEL,
  OLLAMA_EXTRACTION_MODEL,
} from "./ollama-models.mjs";

config({ path: ".env.local" });

const extractionModel = process.env.OLLAMA_EXTRACTION_MODEL ?? OLLAMA_EXTRACTION_MODEL;
const embedModel = process.env.OLLAMA_EMBED_MODEL ?? OLLAMA_EMBED_MODEL;

try {
  assertSupportedOllamaModel(extractionModel, "extraction");
  assertSupportedOllamaModel(embedModel, "embed");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const poolRaw = process.env.OLLAMA_POOL;
const fallback = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const pool = poolRaw
  ? poolRaw
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
  : [fallback];

let okCount = 0;

for (const baseUrl of pool) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`Ollama FAIL (${baseUrl}): HTTP`, res.status);
      continue;
    }
    const data = await res.json();
    const models = (data.models ?? []).map((m) => m.name);
    console.log(`Ollama OK: ${baseUrl}`);
    console.log(`  Models: ${models.length ? models.join(", ") : "(none pulled yet)"}`);

    const hasExtraction = models.some((m) => m.startsWith(extractionModel.split(":")[0]));
    const hasEmbed = models.some((m) => m.startsWith(embedModel.split(":")[0]));
    if (!hasExtraction) {
      console.warn(`  WARN: missing extraction model — run: ollama pull ${extractionModel}`);
    }
    if (!hasEmbed) {
      console.warn(`  WARN: missing embed model — run: ollama pull ${embedModel}`);
    }

    okCount++;
  } catch (e) {
    console.error(`Ollama FAIL (${baseUrl}):`, e instanceof Error ? e.message : e);
  }
}

if (okCount === 0) {
  console.error("\nNo Ollama nodes reachable. Check OLLAMA_POOL / OLLAMA_BASE_URL.");
  process.exit(1);
}

console.log(`\nPool: ${okCount}/${pool.length} node(s) healthy`);
console.log("Extraction/chat model:", extractionModel);
console.log("Embed model:", embedModel);
process.exit(0);
