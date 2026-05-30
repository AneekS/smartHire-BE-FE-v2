import { NextResponse } from "next/server";
import {
  withAuth,
  type AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { getResumeStudioPayload } from "@/services/resumes/resume-studio.service";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const tenantId = authedReq.tenantId!;
      const userId = authedReq.user!.id;

      const payload = await getResumeStudioPayload(userId, tenantId);

      if (!payload?.parsed) {
        return NextResponse.json({ data: null });
      }

      return NextResponse.json({ data: payload });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
