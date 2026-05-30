import { AlertService } from "../../src/monitoring/AlertService";
import { MetricsCollector } from "../../src/monitoring/MetricsCollector";

export async function alertCheckerHandler(): Promise<void> {
  console.log("[alert-checker] Starting");

  await MetricsCollector.sampleQueueDepth();

  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() < 15) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await MetricsCollector.computeDaily(yesterday);
  }
  await MetricsCollector.computeDaily();

  const result = await AlertService.checkAllAlerts();
  console.log("[alert-checker] Complete:", result);
}
