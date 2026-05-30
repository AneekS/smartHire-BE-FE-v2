import { NextResponse } from "next/server";
import { HealthChecker } from "@/monitoring/HealthChecker";

export async function GET() {
  const health = await HealthChecker.getDetailed();
  const body = {
    ...HealthChecker.buildPublicHealthBody(health, health.queue),
    ollama_pool: health.ollama_pool,
    checkedAt: health.checkedAt,
    ok: health.ok,
  };
  return NextResponse.json(body, { status: health.ok ? 200 : 503 });
}
