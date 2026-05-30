import type { CalibrationResult } from "@/calibration/types/calibration.types";
import type { WeightProfile } from "@/scoring/types";
import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";

export type CalibrateResult =
  | {
      status: "SUCCESS";
      calibrationId: string;
      weights: WeightProfile;
      discriminationPower: number;
    }
  | { status: "INSUFFICIENT_DATA"; hired: number; rejected: number }
  | { status: "NOT_MEANINGFUL"; discriminationPower: number };

function toCalibrateResult(result: CalibrationResult): CalibrateResult {
  if (result.status === "SUCCESS" && result.newWeights && result.calibrationId) {
    return {
      status: "SUCCESS",
      calibrationId: result.calibrationId,
      weights: result.newWeights,
      discriminationPower: result.discriminationPower ?? 0,
    };
  }
  if (result.status === "NOT_MEANINGFUL") {
    return {
      status: "NOT_MEANINGFUL",
      discriminationPower: result.discriminationPower ?? 0,
    };
  }
  return {
    status: "INSUFFICIENT_DATA",
    hired: result.hired ?? 0,
    rejected: result.rejected ?? 0,
  };
}

/** @deprecated Prefer WeightCalibrationEngine.run — thin facade for Phase 6 callers */
export class WeightCalibrationService {
  static async calibrate(
    tenantId: string,
    industryProfile: Parameters<typeof WeightCalibrationEngine.run>[1]
  ): Promise<CalibrateResult> {
    const result = await WeightCalibrationEngine.run(tenantId, industryProfile);
    return toCalibrateResult(result);
  }
}
