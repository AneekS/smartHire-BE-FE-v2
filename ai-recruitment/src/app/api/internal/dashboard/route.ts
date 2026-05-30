import { NextRequest, NextResponse } from "next/server";
import { OpsDashboard } from "@/monitoring/OpsDashboard";
import { InternalAuth } from "@/security/InternalAuth";
import { ForbiddenError } from "@/auth/errors";

export async function GET(req: NextRequest) {
  try {
    InternalAuth.requireInternalAuth(req);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const payload = await OpsDashboard.buildPayload(7);
  const html = OpsDashboard.renderHtml(payload);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
