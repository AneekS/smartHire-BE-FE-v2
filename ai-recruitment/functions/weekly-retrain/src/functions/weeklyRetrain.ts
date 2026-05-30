import { app, InvocationContext, Timer } from "@azure/functions";
import { weeklyRetrainHandler } from "../../../index";

async function handler(_timer: Timer, context: InvocationContext): Promise<void> {
  context.log("Weekly retrain + A/B analytics starting");
  await weeklyRetrainHandler();
}

app.timer("weeklyRetrain", {
  schedule: "0 0 3 * * 1",
  handler,
});
