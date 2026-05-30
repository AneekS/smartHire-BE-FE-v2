import { CalibrationScheduler } from "../../src/calibration/CalibrationScheduler";

export async function weeklyRetrainHandler(): Promise<void> {
  console.log("[weekly-retrain] Starting calibration scheduler");
  const summary = await CalibrationScheduler.runWeekly();
  console.log("[weekly-retrain] Complete:", summary);
}
