#!/usr/bin/env node
/**
 * Clear Redis dedup cache for a resume file (use after sparse/bad parse).
 * Usage: node scripts/clear-extraction-cache.mjs path/to/resume.pdf
 */
import { config } from "dotenv";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import Redis from "ioredis";

config({ path: ".env.local" });
config();

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/clear-extraction-cache.mjs <resume.pdf>");
  process.exit(1);
}

const buf = readFileSync(filePath);
const fileKey = `filehash:${createHash("sha256").update(buf).digest("hex")}`;

const redis = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
});

const deleted = await redis.del(fileKey);
console.log(`Deleted ${fileKey}: ${deleted ? "ok" : "not found"}`);
await redis.quit();
