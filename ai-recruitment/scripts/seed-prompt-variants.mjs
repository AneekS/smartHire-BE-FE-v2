#!/usr/bin/env node
/**
 * Seed prompt_variants for A/B testing. Run: node scripts/seed-prompt-variants.mjs
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

const CONTROL_PROMPT = `You are an expert resume parser. Extract ALL information from the resume text into
the exact JSON schema below. Return ONLY valid JSON — no markdown, no preamble,
no explanation.`;

const VARIANT_B_PROMPT = `You are an expert resume parser with strict schema compliance.
Extract ALL information from the resume text into the exact JSON schema below.
Return ONLY valid JSON — no markdown, no preamble, no explanation.

CRITICAL RULES:
- Every required field must be present; use null if absent.
- Normalize dates to YYYY-MM format.
- Map skill domains precisely (FRONTEND, BACKEND, DEVOPS, etc.).
- Quantify achievements with numbers where present in source text.
- Do not invent information not supported by the resume.`;

const VARIANTS = [
  { variantId: "control-broad-v1", promptText: CONTROL_PROMPT, trafficPercent: 50 },
  { variantId: "variant-strict-v1", promptText: VARIANT_B_PROMPT, trafficPercent: 50 },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  for (const v of VARIANTS) {
    await prisma.promptVariant.upsert({
      where: { variantId: v.variantId },
      create: {
        variantId: v.variantId,
        promptText: v.promptText,
        active: true,
        trafficPercent: v.trafficPercent,
      },
      update: {
        promptText: v.promptText,
        active: true,
        trafficPercent: v.trafficPercent,
      },
    });
    console.log(`Upserted prompt variant: ${v.variantId}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
