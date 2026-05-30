/**
 * Backfill resume_versions_v2 + resumes for legacy ResumeVersion rows.
 *
 * Usage: npx tsx --import ./scripts/load-env.mjs scripts/bridge-resume-v2.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureResumeV2Bridge } from "../src/lib/resume-v2-bridge";

async function main() {
  const rows = await prisma.resumeVersion.findMany({
    where: {
      parsedResume: { isNot: null },
      user: { candidate: { isNot: null } },
    },
    select: {
      id: true,
      tenantId: true,
      user: {
        select: {
          tenantId: true,
          candidate: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    const candidateId = row.user.candidate?.id;
    const tenantId = row.tenantId ?? row.user.tenantId;
    if (!candidateId || !tenantId) {
      fail++;
      continue;
    }
    try {
      await ensureResumeV2Bridge({
        legacyResumeVersionId: row.id,
        candidateId,
        tenantId,
      });
      ok++;
      if (ok % 10 === 0) console.log(`Bridged ${ok} resumes...`);
    } catch (e) {
      fail++;
      console.warn(
        `Skip ${row.id}:`,
        e instanceof Error ? e.message : e
      );
    }
  }

  console.log(`Done. bridged=${ok} failed=${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
