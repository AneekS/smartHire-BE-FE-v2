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
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'User'
     AND column_name IN ('clerkId', 'tenantId')`
  );
  console.log("User columns:", cols.rows.map((r) => r.column_name).join(", ") || "(none)");

  const tenants = await client.query(`SELECT COUNT(*)::int AS n FROM "Tenant"`);
  const migrations = await client.query(
    `SELECT migration_name, finished_at IS NOT NULL AS applied
     FROM "_prisma_migrations"
     ORDER BY started_at DESC
     LIMIT 5`
  );
  console.log("Tenant count:", tenants.rows[0].n);
  console.log("Recent migrations:", migrations.rows);
} finally {
  client.release();
  await pool.end();
}
