import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { ResumeSearchQuerySchema } from "@/lib/validators/ats.schema";
import { VectorSearchRouter } from "@/lib/VectorSearchRouter";
import { embedText } from "@/embedding/embedder";
import { prisma } from "@/lib/db";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const { searchParams } = new URL(authedReq.url);
      const parsed = ResumeSearchQuerySchema.safeParse({
        q: searchParams.get("q") ?? "",
        industry: searchParams.get("industry") ?? undefined,
        seniority: searchParams.get("seniority") ?? undefined,
        topK: searchParams.get("topK") ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { q, topK } = parsed.data;
      const { vector } = await embedText(q);

      const hits = await VectorSearchRouter.hybridSearch(q, vector, {
        topK,
        tenantId,
      });

      const resumeVersionIds = [
        ...new Set(
          hits
            .map((h) => h.resumeVersionId)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const skillRows = resumeVersionIds.length
        ? await prisma.parsedResume.findMany({
            where: { resumeVersionId: { in: resumeVersionIds } },
            select: { resumeVersionId: true, parsedData: true },
          })
        : [];

      const skillsByResume = new Map<string, string[]>();
      for (const row of skillRows) {
        if (!row.parsedData || typeof row.parsedData !== "object") continue;
        const data = row.parsedData as Record<string, unknown>;
        const skills = Array.isArray(data.skills)
          ? (data.skills as unknown[]).map(String)
          : [];
        skillsByResume.set(row.resumeVersionId, skills.slice(0, 10));
      }

      return NextResponse.json({
        data: {
          hits: hits.map((h) => ({
            resumeVersionId: h.resumeVersionId,
            candidateId: h.candidateId,
            section: h.section,
            score: h.fusedScore,
            skills: h.resumeVersionId
              ? skillsByResume.get(h.resumeVersionId) ?? []
              : [],
          })),
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}
