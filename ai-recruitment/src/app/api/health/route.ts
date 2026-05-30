import { NextResponse } from "next/server";
import { HealthChecker } from "@/monitoring/HealthChecker";

export async function GET() {
  const health = await HealthChecker.getSummary();
  const body = HealthChecker.buildPublicHealthBody(health);
  return NextResponse.json(body, { status: health.ok ? 200 : 503 });
}
