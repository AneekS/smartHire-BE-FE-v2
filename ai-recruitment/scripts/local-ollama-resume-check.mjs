#!/usr/bin/env node
/**
 * Diagnose local resume pipeline + Ollama config.
 * Usage: node scripts/local-ollama-resume-check.mjs
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

const checks = [];

function ok(msg) {
  checks.push({ ok: true, msg });
}
function fail(msg) {
  checks.push({ ok: false, msg });
}

const timeout = Number(process.env.OLLAMA_EXTRACTION_TIMEOUT_MS ?? 180000);
const fast = process.env.EXTRACTION_FAST_MODE === "true";
const asyncPipe = process.env.ASYNC_RESUME_PIPELINE === "true";
const model = process.env.OLLAMA_EXTRACTION_MODEL ?? "qwen3:8b";

console.log("\n=== Local Ollama resume pipeline check ===\n");
console.log("OLLAMA_EXTRACTION_MODEL:", model);
console.log("OLLAMA_EXTRACTION_TIMEOUT_MS:", timeout, `(${Math.round(timeout / 1000)}s)`);
console.log("EXTRACTION_FAST_MODE:", fast);
console.log("ASYNC_RESUME_PIPELINE:", asyncPipe);
console.log("SKIP_RESUME_IMPROVEMENTS_LLM:", process.env.SKIP_RESUME_IMPROVEMENTS_LLM ?? "false");
console.log("RESUME_WORKER_CONCURRENCY:", process.env.RESUME_WORKER_CONCURRENCY ?? "1");
console.log("");

if (timeout < 300000) {
  fail(`Timeout is only ${Math.round(timeout / 1000)}s — set OLLAMA_EXTRACTION_TIMEOUT_MS=600000`);
} else {
  ok(`Timeout ${Math.round(timeout / 1000)}s is sufficient for local qwen3:8b`);
}

if (!fast) {
  fail("EXTRACTION_FAST_MODE=false — enable true for single-pass parsing (much faster)");
} else {
  ok("Fast extraction mode enabled (pass 1 only)");
}

try {
  const res = await fetch(
    `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/api/tags`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const models = (data.models ?? []).map((m) => m.name);
  const hasModel = models.some((m) => m.startsWith(model.split(":")[0]));
  if (!hasModel) {
    fail(`Model ${model} not pulled — run: ollama pull ${model}`);
  } else {
    ok(`Ollama reachable with ${model}`);
  }
} catch (e) {
  fail(`Ollama not reachable — run: ollama serve (${e instanceof Error ? e.message : e})`);
}

if (asyncPipe) {
  console.log("\nAsync mode: you MUST run in a separate terminal:");
  console.log("  npm run worker:parse");
  console.log("After changing .env.local, restart worker:parse and verify it logs timeout=600000ms");
} else {
  ok("Sync mode — only npm run dev needed (no worker:parse)");
}

console.log("\n--- Results ---");
for (const c of checks) {
  console.log(c.ok ? "✓" : "✗", c.msg);
}

const failed = checks.filter((c) => !c.ok).length;
if (failed) {
  console.log("\nRecommended .env.local for local-only Ollama:\n");
  console.log(`ASYNC_RESUME_PIPELINE=false
EXTRACTION_FAST_MODE=true
SKIP_RESUME_IMPROVEMENTS_LLM=true
SKIP_INLINE_EMBED=true
OLLAMA_EXTRACTION_MODEL=qwen3:8b
OLLAMA_EXTRACTION_TIMEOUT_MS=600000
OLLAMA_EXTRACTION_MAX_CHARS=10000
OLLAMA_EXTRACTION_NUM_PREDICT=1536
RESUME_WORKER_CONCURRENCY=1`);
  process.exit(1);
}

console.log("\nConfig looks good. Restart worker:parse if async, then upload a text-based PDF.\n");
process.exit(0);
