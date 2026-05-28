import { app, InvocationContext, Timer } from "@azure/functions";

async function alertCheckerHandler(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log("Alert checker starting");

  const { AlertChecker } = await import("../../../src/monitoring/alerts");
  const { MetricsCollector } = await import("../../../src/monitoring/metrics");

  await MetricsCollector.sampleQueueDepth();

  const hour = new Date().getUTCHours();
  const minute = new Date().getUTCMinutes();
  if (hour === 0 && minute < 15) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await MetricsCollector.computeDaily(yesterday);
  }
  await MetricsCollector.computeDaily();

  const result = await AlertChecker.checkAllAlerts();
  context.log("Alert checker complete:", result);
}

app.timer("alertChecker", {
  schedule: "0 */15 * * * *",
  handler: alertCheckerHandler,
});
