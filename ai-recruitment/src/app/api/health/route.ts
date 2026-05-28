import { NextResponse } from "next/server";
import { getHealthSummary } from "@/monitoring/health-probes";

export async function GET() {
  const health = await getHealthSummary();
  return NextResponse.json(
    { ok: health.ok },
    { status: health.ok ? 200 : 503 }
  );
}
