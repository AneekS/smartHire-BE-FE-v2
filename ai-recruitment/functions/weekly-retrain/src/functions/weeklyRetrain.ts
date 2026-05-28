import { app, InvocationContext, Timer } from "@azure/functions";

async function weeklyRetrainHandler(
  _timer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log("Weekly retrain + A/B analytics starting");

  const { WeightRecalibrator } = await import(
    "../../../src/feedback/retrainer"
  );
  const { PromptABTester } = await import("../../../src/feedback/ab-testing");

  const retrain = await WeightRecalibrator.recalibrateWeights();
  context.log("Weight recalibration:", retrain);

  const analytics = await PromptABTester.runAnalytics();
  context.log("A/B analytics:", analytics);
}

app.timer("weeklyRetrain", {
  schedule: "0 0 3 * * 1",
  handler: weeklyRetrainHandler,
});
