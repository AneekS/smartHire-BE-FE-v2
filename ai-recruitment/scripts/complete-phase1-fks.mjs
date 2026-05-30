/**
 * Apply remaining phase1 foreign keys after seed-legacy-tenants.mjs.
 * Idempotent: skips constraints that already exist.
 */
import { config } from "dotenv";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  __dirname,
  "../prisma/migrations/20260601120000_phase1_target_domain/migration.sql"
);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function extractFkStatements(sql) {
  const lines = sql.split("\n");
  const fks = [];
  let inFkSection = false;
  for (const line of lines) {
    if (line.includes("-- AddForeignKey")) inFkSection = true;
    if (!inFkSection) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("ALTER TABLE") && trimmed.includes("ADD CONSTRAINT")) {
      fks.push(trimmed.endsWith(";") ? trimmed : `${trimmed};`);
    }
  }
  return fks;
}

async function constraintExists(client, constraintName) {
  const res = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conname = $1`,
    [constraintName]
  );
  return res.rowCount > 0;
}

function parseConstraintName(stmt) {
  const m = stmt.match(/ADD CONSTRAINT "([^"]+)"/);
  return m?.[1] ?? null;
}

async function main() {
  const sql = readFileSync(migrationPath, "utf8");
  const fks = extractFkStatements(sql);
  const client = await pool.connect();
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const stmt of fks) {
      const name = parseConstraintName(stmt);
      if (!name) continue;
      if (await constraintExists(client, name)) {
        skipped++;
        continue;
      }
      try {
        await client.query(stmt);
        console.log(`OK: ${name}`);
        applied++;
      } catch (e) {
        console.error(`FAIL: ${name}`, e.message);
        failed++;
      }
    }
    console.log(`Done. applied=${applied} skipped=${skipped} failed=${failed}`);
    if (failed > 0) process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
