/**
 * Seed job_listings for Job ATS Scorer (25 mock roles).
 * Usage: npm run db:seed:jobs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import pg from "pg";
import { jobs } from "./build-job-listings-sql.mjs";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seedWithPg() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS cnt FROM job_listings"
  );
  if (rows[0].cnt > 0) {
    console.log(`job_listings already has ${rows[0].cnt} rows — skipping seed.`);
    await pool.end();
    return;
  }

  let sql = readFileSync(
    join(__dirname, "job-listings-seed-generated.sql"),
    "utf8"
  );
  sql = sql.replace(/TRUNCATE TABLE job_listings CASCADE;\s*/i, "");

  await pool.query(sql);
  const after = await pool.query("SELECT COUNT(*)::int AS cnt FROM job_listings");
  console.log(`Seeded ${after.rows[0].cnt} job listings (${jobs.length} in source data).`);
  await pool.end();
}

seedWithPg().catch((e) => {
  console.error(e);
  process.exit(1);
});
