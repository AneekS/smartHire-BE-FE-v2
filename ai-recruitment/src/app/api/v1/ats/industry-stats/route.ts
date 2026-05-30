import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { IndustryStatsQuerySchema } from "@/lib/validators/ats.schema";
import { IndustryStatsService } from "@/services/IndustryStatsService";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const { searchParams } = new URL(authedReq.url);
      const parsed = IndustryStatsQuerySchema.safeParse({
        industry: searchParams.get("industry") ?? undefined,
        seniorityBand: searchParams.get("seniorityBand") ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { industry, seniorityBand } = parsed.data;
      const { data, cached } = await IndustryStatsService.getStats(
        tenantId,
        industry,
        seniorityBand
      );

      return NextResponse.json({ data, meta: { cached } });
    } catch (error) {
      return handleError(error);
    }
  });
}
