import { prisma } from "@/lib/prisma";
import type { ParsedResume, ResumeVersion } from "@prisma/client";

export type EnsureResumeV2Input = {
  legacyResumeVersionId: string;
  candidateId: string;
  tenantId: string;
};

/**
 * Ensures a legacy ResumeVersion has a v2 stack row (resumes + resume_versions_v2)
 * linked to the same ParsedResume blob. Idempotent.
 */
export async function ensureResumeV2Bridge(
  input: EnsureResumeV2Input
): Promise<string> {
  const { legacyResumeVersionId, candidateId, tenantId } = input;

  const existing = await prisma.resumeVersionV2.findFirst({
    where: {
      OR: [
        { id: legacyResumeVersionId },
        { legacyResumeVersionId },
      ],
      tenantId,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const legacy = await prisma.resumeVersion.findUnique({
    where: { id: legacyResumeVersionId },
    include: { parsedResume: true },
  });

  if (!legacy) {
    throw new Error(`ResumeVersion ${legacyResumeVersionId} not found`);
  }

  if (!legacy.parsedResume?.parsedData) {
    throw new Error(
      `Resume ${legacyResumeVersionId} is not parsed; run the resume pipeline first`
    );
  }

  const v2Id = await prisma.$transaction(async (tx) => {
    let resumeContainer = await tx.resume.findFirst({
      where: { candidateId, tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!resumeContainer) {
      resumeContainer = await tx.resume.create({
        data: {
          candidateId,
          tenantId,
          isActive: true,
        },
      });
    }

    const versionCount = await tx.resumeVersionV2.count({
      where: { resumeId: resumeContainer.id },
    });

    const parsed = legacy.parsedResume as ParsedResume;

    const v2 = await tx.resumeVersionV2.create({
      data: {
        resumeId: resumeContainer.id,
        tenantId,
        legacyResumeVersionId: legacy.id,
        parsedResumeId: parsed.id,
        blobPath: legacy.filePath,
        blobUrl: legacy.fileUrl,
        mimeType: guessMime(legacy),
        parseStatus: "COMPLETED",
        parseConfidence: parsed.parseConfidence,
        requiresManualReview: (parsed.parseConfidence ?? 1) < 0.55,
        versionNumber: versionCount + 1,
      },
    });

    await tx.resume.update({
      where: { id: resumeContainer.id },
      data: { currentVersionId: v2.id },
    });

    if (!legacy.tenantId || legacy.tenantId !== tenantId) {
      await tx.resumeVersion.update({
        where: { id: legacy.id },
        data: { tenantId },
      });
    }

    if (!parsed.tenantId || parsed.tenantId !== tenantId) {
      await tx.parsedResume.update({
        where: { id: parsed.id },
        data: { tenantId },
      });
    }

    return v2.id;
  });

  return v2Id;
}

function guessMime(legacy: ResumeVersion): string | undefined {
  const path = legacy.filePath ?? "";
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return undefined;
}
