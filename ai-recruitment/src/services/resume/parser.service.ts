/**
 * @deprecated Use `@/parsing/extractor` and `@/pipeline/resume-pipeline` instead.
 */
export {
  parseResumeMultiPass,
  extractResumePass1,
  extractResumePass2,
  generateImprovements,
} from "@/parsing/extractor";

export type { ParsedResume } from "@/models/adapters/resume-ui.adapter";
export { ResumeSchema, parseResumeSchema } from "@/models/resume.schema";

import { parseResumeMultiPass } from "@/parsing/extractor";
import { prisma } from "@/lib/db";

/** Legacy service — use runResumePipeline for full upload flow. */
export class ParserService {
  async parse(rawText: string, resumeVersionId: string, _candidateId: string) {
    await prisma.resumeVersion.update({
      where: { id: resumeVersionId },
      data: { status: "DRAFT" },
    });

    try {
      const result = await parseResumeMultiPass(rawText);

      await prisma.parsedResume.upsert({
        where: { resumeVersionId },
        create: {
          resumeVersionId,
          parsedData: JSON.parse(JSON.stringify(result.resume)),
        },
        update: {
          parsedData: JSON.parse(JSON.stringify(result.resume)),
        },
      });

      await prisma.resumeVersion.update({
        where: { id: resumeVersionId },
        data: {
          status: "ACTIVE",
          parsedContent: JSON.stringify(result.ui),
        },
      });

      return result.resume;
    } catch (error) {
      await prisma.resumeVersion.update({
        where: { id: resumeVersionId },
        data: { status: "DRAFT" },
      });
      throw error;
    }
  }
}
