import {
  generateAtsScore,
  getAtsScoreById,
} from "@/services/ats/ats-generate.service";
import { NotificationService } from "@/services/NotificationService";
import { trackEvent } from "@/monitoring/appInsights";

export class ATSScoringService {
  static async score(input: {
    resumeVersionId: string;
    jobId: string;
    tenantId: string;
    candidateId: string;
    userId: string;
  }) {
    const result = await generateAtsScore({
      resumeVersionId: input.resumeVersionId,
      jobId: input.jobId,
      tenantId: input.tenantId,
      candidateId: input.candidateId,
    });

    trackEvent("ats_score_computed", {
      tenantId: input.tenantId,
      jobId: input.jobId,
      scoreId: result.id ?? "ephemeral",
      finalScore: String(result.finalScore),
    });

    await NotificationService.notifyAtsScoreComplete({
      userId: input.userId,
      tenantId: input.tenantId,
      scoreId: result.id,
      finalScore: result.finalScore,
      jobId: result.jobId,
    });

    return result;
  }

  static async getById(id: string, tenantId: string, candidateId?: string) {
    return getAtsScoreById(id, tenantId, candidateId);
  }
}

/** @deprecated Use ATSScoringService */
export { generateAtsScore, getAtsScoreById };
