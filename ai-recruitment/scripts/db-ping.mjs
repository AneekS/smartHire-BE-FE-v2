/**
 * Quick Azure PostgreSQL connectivity check (no psql required).
 * Usage: npm run db:ping
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
  connectionTimeoutMillis: 15_000,
});

try {
  const { rows } = await pool.query(
    "SELECT 1 AS ok, current_database() AS database, current_user AS user"
  );
  console.log("DB OK:", rows[0]);
  process.exit(0);
} catch (e) {
  console.error("DB FAIL:", e instanceof Error ? e.message : e);
  console.error(
    "\nCheck Azure Portal → PostgreSQL → Networking → allow your current public IP."
  );
  process.exit(1);
} finally {
  await pool.end();
}
