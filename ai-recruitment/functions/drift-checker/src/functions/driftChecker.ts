import { app, InvocationContext, Timer } from "@azure/functions";

async function driftCheckerHandler(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log("Embedding drift check starting");

  const { DriftDetector } = await import("../../../src/feedback/drift");
  const result = await DriftDetector.computeEmbeddingDrift();
  context.log("Drift check result:", result);
}

app.timer("driftChecker", {
  schedule: "0 0 2 * * 0",
  handler: driftCheckerHandler,
});
