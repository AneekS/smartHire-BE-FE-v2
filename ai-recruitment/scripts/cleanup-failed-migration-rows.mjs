/**
 * Remove stale failed rows from _prisma_migrations when a migration was
 * resolved with --applied after manual fix.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const client = await pool.connect();
try {
  const res = await client.query(
    `DELETE FROM "_prisma_migrations"
     WHERE finished_at IS NULL
     RETURNING migration_name`
  );
  console.log("Removed unfinished migration rows:", res.rows);
} finally {
  client.release();
  await pool.end();
}
