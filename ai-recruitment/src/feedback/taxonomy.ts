import { prisma } from "@/lib/db";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { sendOpsAlert } from "@/lib/ops-alerts";
import type { RecordCorrectionInput } from "@/feedback/types";

const ALIAS_THRESHOLD = 5;
const REVIEW_THRESHOLD = 20;

export class TaxonomyExpander {
  static async processCorrection(input: RecordCorrectionInput) {
    const correction = await prisma.recruiterCorrection.create({
      data: {
        resumeId: input.resumeId,
        field: input.field,
        originalValue: input.originalValue,
        correctedValue: input.correctedValue,
        recruiterId: input.recruiterId,
      },
    });

    const count = await prisma.recruiterCorrection.count({
      where: {
        field: input.field,
        originalValue: input.originalValue,
        correctedValue: input.correctedValue,
      },
    });

    let aliasCreated = false;

    if (count >= ALIAS_THRESHOLD && input.field.startsWith("skills")) {
      const alias = input.originalValue.trim().toLowerCase();
      const canonical = input.correctedValue.trim();

      try {
        await prisma.skillAlias.upsert({
          where: { alias },
          create: {
            alias,
            canonical,
            source: "RECRUITER_CORRECTION",
          },
          update: {
            canonical,
            source: "RECRUITER_CORRECTION",
          },
        });
        await SkillCanonicalizer.reload();
        aliasCreated = true;
        console.log("[taxonomy] taxonomy_expansion", {
          alias,
          canonical,
          count,
        });
      } catch (e) {
        console.error("[taxonomy] alias insert failed:", e);
      }
    }

    if (count >= REVIEW_THRESHOLD && input.field.startsWith("skills")) {
      await sendOpsAlert({
        subject: "Skill taxonomy review needed",
        body: `Correction "${input.originalValue}" → "${input.correctedValue}" on field "${input.field}" reached ${count} occurrences. Please review for canonical taxonomy updates.`,
        severity: "warning",
      });
    }

    return { correction, count, aliasCreated };
  }
}
