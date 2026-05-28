import { NextResponse } from "next/server";
import { getDetailedHealth } from "@/monitoring/health-probes";

export async function GET() {
  const health = await getDetailedHealth();
  return NextResponse.json(
    {
      db: health.db,
      redis: health.redis,
      azure_search: health.azure_search,
      ollama_pool: health.ollama_pool,
      checkedAt: health.checkedAt,
      ok: health.ok,
    },
    { status: health.ok ? 200 : 503 }
  );
}
