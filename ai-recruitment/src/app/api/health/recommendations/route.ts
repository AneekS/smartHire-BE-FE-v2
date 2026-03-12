import { NextResponse } from "next/server";
import { cacheHealth } from "@/lib/cache";
import { queueHealth } from "@/lib/queue";

export async function GET() {
  const [cache, queue] = await Promise.all([cacheHealth(), queueHealth()]);

  const healthy = cache.ready && queue.ready;
  const status = healthy ? 200 : 503;

  return NextResponse.json(
    {
      service: "job-recommendation-engine",
      status: healthy ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        cache,
        queue,
      },
    },
    { status }
  );
}
