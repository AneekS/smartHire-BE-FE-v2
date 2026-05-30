import { app, InvocationContext, Timer } from "@azure/functions";
import { alertCheckerHandler } from "../../../index";

async function handler(_timer: Timer, context: InvocationContext): Promise<void> {
  context.log("Alert checker starting");
  await alertCheckerHandler();
}

app.timer("alertChecker", {
  schedule: "0 */15 * * * *",
  handler,
});
