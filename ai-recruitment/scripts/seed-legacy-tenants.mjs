/**
 * Seed Tenant rows for legacy tenantId values (e.g. Company.id stored as tenantId)
 * before phase1 FK constraints can be applied.
 *
 * Usage:
 *   node scripts/seed-legacy-tenants.mjs
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

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

/** Tables that may have tenantId before or during phase1 FK rollout */
const TENANT_ID_SOURCES = [
  { table: "extraction_events", quoted: true },
  { table: "daily_metrics", quoted: false },
  { table: "embedding_drift_runs", quoted: false },
  { table: "ResumeVersion", quoted: true },
  { table: "parsed_resumes", quoted: true },
  { table: "User", quoted: true },
  { table: "Company", quoted: true },
  { table: "Recruiter", quoted: true },
  { table: "Job", quoted: true },
  { table: "Candidate", quoted: true },
  { table: "Application", quoted: true },
  { table: "Notification", quoted: true },
  { table: "recruiter_decisions", quoted: false },
  { table: "tenant_weight_profiles", quoted: false },
  { table: "prompt_ab_assignments", quoted: false },
];

function q(name, quoted) {
  return quoted ? `"${name}"` : name;
}

async function tableExists(client, table, quoted) {
  const name = quoted ? table : table;
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [quoted ? table : table]
  );
  return res.rowCount > 0;
}

async function columnExists(client, table, quoted) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenantId'`,
    [quoted ? table : table]
  );
  return res.rowCount > 0;
}

async function collectOrphanTenantIds(client) {
  const ids = new Set();
  for (const { table, quoted } of TENANT_ID_SOURCES) {
    if (!(await tableExists(client, table, quoted))) continue;
    if (!(await columnExists(client, table, quoted))) continue;
    const t = q(table, quoted);
    const res = await client.query(
      `SELECT DISTINCT "tenantId" AS id FROM ${t} WHERE "tenantId" IS NOT NULL`
    );
    for (const row of res.rows) ids.add(row.id);
  }
  return ids;
}

async function seedFromCompanies(client) {
  const hasTenant = await tableExists(client, "Tenant", true);
  if (!hasTenant) {
    console.log("Tenant table does not exist yet — skip company seed");
    return 0;
  }
  const hasCompany = await tableExists(client, "Company", true);
  if (!hasCompany) return 0;

  const res = await client.query(
    `INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
     SELECT
       c.id,
       COALESCE(NULLIF(trim(c.name), ''), 'Company ' || substr(c.id, 1, 8)),
       'company-' || substr(replace(c.id, '-', ''), 1, 16),
       true,
       NOW(),
       NOW()
     FROM "Company" c
     WHERE NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = c.id)
     ON CONFLICT (id) DO NOTHING`
  );
  return res.rowCount ?? 0;
}

async function seedOrphans(client, orphanIds) {
  let inserted = 0;
  for (const id of orphanIds) {
    const exists = await client.query(`SELECT 1 FROM "Tenant" WHERE id = $1`, [id]);
    if (exists.rowCount > 0) continue;

    const slug = `legacy-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
    const res = await client.query(
      `INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, `Legacy tenant ${id.slice(0, 8)}`, slug]
    );
    if ((res.rowCount ?? 0) > 0) inserted++;
  }
  return inserted;
}

async function main() {
  const client = await pool.connect();
  try {
    const hasTenant = await tableExists(client, "Tenant", true);
    if (!hasTenant) {
      console.error("Tenant table missing — run phase1 migration first or create Tenant manually");
      process.exit(1);
    }

    const fromCompany = await seedFromCompanies(client);
    console.log(`Seeded ${fromCompany} tenants from Company`);

    const allIds = await collectOrphanTenantIds(client);
    const existing = await client.query(`SELECT id FROM "Tenant"`);
    const existingSet = new Set(existing.rows.map((r) => r.id));
    const orphans = [...allIds].filter((id) => !existingSet.has(id));
    console.log(`Distinct tenantIds in data: ${allIds.size}, orphans needing Tenant row: ${orphans.length}`);

    const fromOrphans = await seedOrphans(client, orphans);
    console.log(`Seeded ${fromOrphans} orphan legacy tenants`);

    const stillOrphan = await client.query(
      `SELECT DISTINCT e."tenantId"
       FROM "extraction_events" e
       WHERE e."tenantId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = e."tenantId")
       LIMIT 5`
    );
    if (stillOrphan.rows.length > 0) {
      console.error("Still have extraction_events without Tenant:", stillOrphan.rows);
      process.exit(1);
    }

    console.log("Legacy tenant seed complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
