import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { buildDashboardPayload } from "@/monitoring/dashboard-data";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_DASHBOARD_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret === secret) return true;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await buildDashboardPayload(7);
  const templatePath = path.join(
    process.cwd(),
    "src/monitoring/templates/dashboard.html"
  );
  const template = readFileSync(templatePath, "utf8");
  const html = template.replace(
    "__DASHBOARD_JSON__",
    JSON.stringify(data).replace(/</g, "\\u003c")
  );

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
