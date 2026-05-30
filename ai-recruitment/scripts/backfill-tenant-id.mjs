/**
 * Backfill tenantId on legacy rows after Phase 1 migration.
 *
 * Usage:
 *   node scripts/backfill-tenant-id.mjs
 *
 * Env:
 *   DATABASE_URL — required
 *   DEFAULT_TENANT_SLUG — default "default" (creates Tenant if missing)
 *   DEFAULT_TENANT_NAME — default "Default Tenant"
 */
import { config } from "dotenv";
import pg from "pg";
import { randomBytes } from "crypto";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const slug = process.env.DEFAULT_TENANT_SLUG ?? "default";
const name = process.env.DEFAULT_TENANT_NAME ?? "Default Tenant";

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

async function ensureDefaultTenant(client) {
  const existing = await client.query(
    `SELECT id FROM "Tenant" WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }
  const id = `tenant_${randomBytes(12).toString("hex")}`;
  await client.query(
    `INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, NOW(), NOW())`,
    [id, name, slug]
  );
  console.log(`Created default tenant ${slug} (${id})`);
  return id;
}

async function backfillTable(client, tenantId, table, column = "tenantId") {
  const quoted = `"${table.replace(/"/g, "")}"`;
  const col = `"${column}"`;
  const res = await client.query(
    `UPDATE ${quoted} SET ${col} = $1 WHERE ${col} IS NULL`,
    [tenantId]
  );
  console.log(`${table}: updated ${res.rowCount ?? 0} rows`);
}

async function backfillCandidateTenants(client, tenantId) {
  const res = await client.query(
    `UPDATE "Candidate" c
     SET "tenantId" = COALESCE(c."tenantId", rv."tenantId", $1)
     FROM (
       SELECT DISTINCT ON ("userId") "userId", "tenantId"
       FROM "ResumeVersion"
       WHERE "tenantId" IS NOT NULL
       ORDER BY "userId", "createdAt" DESC
     ) rv
     JOIN "Candidate" cand ON cand."userId" = rv."userId"
     WHERE c.id = cand.id AND c."tenantId" IS NULL`,
    [tenantId]
  );
  console.log(`Candidate (from ResumeVersion): updated ${res.rowCount ?? 0} rows`);

  await client.query(
    `UPDATE "Candidate" SET "tenantId" = $1 WHERE "tenantId" IS NULL`,
    [tenantId]
  );
}

async function backfillDailyMetrics(client, tenantId) {
  await client.query(
    `UPDATE daily_metrics
     SET "metricName" = COALESCE("metricName", "metricKey"),
         "metricValue" = COALESCE("metricValue", value),
         "tenantId" = COALESCE("tenantId", $1)
     WHERE "tenantId" IS NULL OR "metricName" IS NULL OR "metricValue" IS NULL`,
    [tenantId]
  );
  console.log("daily_metrics: synced metricName/metricValue/tenantId");
}

async function backfillApplications(client, tenantId) {
  await client.query(
    `UPDATE "Application"
     SET "appliedAt" = COALESCE("appliedAt", "createdAt"),
         "tenantId" = COALESCE("tenantId", $1)
     WHERE "appliedAt" IS NULL OR "tenantId" IS NULL`,
    [tenantId]
  );
  console.log("Application: appliedAt + tenantId backfill done");
}

async function syncResumeTenantsFromUsers(client) {
  const res = await client.query(
    `UPDATE "ResumeVersion" rv
     SET "tenantId" = u."tenantId"
     FROM "User" u
     WHERE rv."userId" = u.id
       AND u."tenantId" IS NOT NULL
       AND (rv."tenantId" IS NULL OR rv."tenantId" <> u."tenantId")`
  );
  console.log(`ResumeVersion (from User): updated ${res.rowCount ?? 0} rows`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tenantId = await ensureDefaultTenant(client);

    await syncResumeTenantsFromUsers(client);

    const tables = [
      "User",
      "Company",
      "Recruiter",
      "Job",
      "Candidate",
      "Application",
      "Notification",
      "parsed_resumes",
      "extraction_events",
      "daily_metrics",
      "embedding_drift_runs",
      "ResumeVersion",
    ];

    for (const table of tables) {
      if (table === "Candidate") {
        await backfillCandidateTenants(client, tenantId);
        continue;
      }
      if (table === "daily_metrics") {
        await backfillDailyMetrics(client, tenantId);
        continue;
      }
      if (table === "Application") {
        await backfillApplications(client, tenantId);
        continue;
      }
      await backfillTable(client, tenantId, table);
    }

    await client.query("COMMIT");
    console.log("Backfill complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
