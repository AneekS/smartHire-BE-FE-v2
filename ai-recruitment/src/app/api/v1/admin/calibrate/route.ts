import { NextResponse } from "next/server";
import { RBACGuard } from "@/auth/RBACGuard";
import { AuditLogger } from "@/auth/AuditLogger";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";
import { handleError } from "@/lib/errors";
import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";
import type { IndustryProfile } from "@prisma/client";

export async function POST(req: AuthenticatedRequest) {
  return RBACGuard.withPermission(req, "trigger_calibration", async (authedReq) => {
    try {
      const tenantIdParam = new URL(authedReq.url).searchParams.get("tenantId");
      const tenantId = tenantIdParam ?? authedReq.tenantId!;
      const industryParam = new URL(authedReq.url).searchParams.get("industry");

      AuditLogger.log("ADMIN_ACCESS", {
        tenantId,
        userId: authedReq.user!.id,
        metadata: { action: "trigger_calibration", industry: industryParam },
        req: authedReq,
      });

      const results: unknown[] = [];

      if (industryParam) {
        results.push(
          await WeightCalibrationEngine.run(
            tenantId,
            industryParam as IndustryProfile
          )
        );
      } else {
        const industries: IndustryProfile[] = [
          "TECH",
          "FINANCE",
          "HEALTHCARE",
          "SALES",
          "CREATIVE",
          "LEGAL",
          "GENERAL",
        ];
        for (const industry of industries) {
          results.push(await WeightCalibrationEngine.run(tenantId, industry));
        }
      }

      return NextResponse.json({
        data: {
          calibrations: results,
          tenantId,
        },
      });
    } catch (error) {
      return handleError(error);
    }
  });
}
