import * as Sentry from "@sentry/nextjs";

let initialized = false;

/** Server-side Sentry helper (root Next.js configs remain in sentry.*.config.ts). */
export function initSentryServer(): void {
  if (initialized || process.env.NEXT_RUNTIME === "edge") return;
  initialized = true;
}

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
    return;
  }
  Sentry.captureException(error);
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  });
}
