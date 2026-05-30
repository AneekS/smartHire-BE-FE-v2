import { app, InvocationContext, Timer } from "@azure/functions";
import { driftCheckerHandler } from "../../../index";

async function handler(_timer: Timer, context: InvocationContext): Promise<void> {
  context.log("Embedding drift check starting");
  const result = await driftCheckerHandler();
  context.log("Drift check result:", result);
}

app.timer("driftChecker", {
  schedule: "0 0 2 * * 0",
  handler,
});
