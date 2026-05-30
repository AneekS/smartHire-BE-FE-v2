import * as Sentry from "@sentry/nextjs";
import { initSentryServer } from "@/monitoring/sentry";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    initSentryServer();
    const { runStartupChecks } = await import("@/lib/startup");
    runStartupChecks().catch((e) => {
      console.error("[instrumentation] Startup checks failed:", e);
    });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
