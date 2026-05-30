import { NextResponse } from "next/server";

import { withRecruiterAccess } from "@/auth/RBACGuard";

import { RecruiterAccessGuard } from "@/auth/RecruiterAccessGuard";

import { AuditLogger } from "@/auth/AuditLogger";

import { ForbiddenError } from "@/auth/errors";

import type { AuthenticatedRequest } from "@/lib/auth-middleware";

import { handleError } from "@/lib/errors";

import { RecruiterOutcomeSchema } from "@/lib/validators/ats.schema";

import { RecruiterDecisionService } from "@/feedback/decisions";

import { WeightCalibrationEngine } from "@/calibration/WeightCalibrationEngine";

import { InputSanitizer } from "@/security/InputSanitizer";

import { prisma } from "@/lib/db";

import type { IndustryProfile, RecruiterOutcome } from "@prisma/client";



const CALIBRATION_DECISION_THRESHOLD = 10;



export async function POST(req: AuthenticatedRequest) {

  return withRecruiterAccess(req, async (authedReq) => {

    try {

      const tenantId = authedReq.tenantId!;

      const body = RecruiterOutcomeSchema.safeParse(await req.json());

      if (!body.success) {

        return NextResponse.json(

          { error: body.error.flatten() },

          { status: 400 }

        );

      }



      const noteText = body.data.noteText

        ? InputSanitizer.sanitizeString(body.data.noteText, { maxLength: 2000 })

        : undefined;



      const recruiter = await RecruiterAccessGuard.requireRecruiterProfile(

        authedReq.user!.id

      );



      const atsScore = await prisma.applicationAtsScore.findFirst({

        where: { id: body.data.jobAtsScoreId, tenantId },

        include: {

          job: { select: { id: true, userId: true, industryProfile: true } },

          application: { select: { candidateId: true } },

          resumeVersion: {

            select: { legacyResumeVersionId: true, id: true },

          },

        },

      });



      if (!atsScore) {

        return NextResponse.json({ error: "ATS score not found" }, { status: 404 });

      }



      await RecruiterAccessGuard.assertJobAccess(

        authedReq.user!.id,

        atsScore.jobId,

        tenantId

      );



      const outcomeSignal = await prisma.recruiterOutcomeSignal.create({

        data: {

          tenantId,

          recruiterId: recruiter.id,

          applicationAtsScoreId: atsScore.id,

          candidateId: atsScore.application.candidateId,

          jobId: atsScore.jobId,

          outcome: body.data.outcome as RecruiterOutcome,

          noteText,

          atsFinalScoreAtOutcome: atsScore.finalScore,

        },

      });



      const resumeId =

        atsScore.resumeVersion.legacyResumeVersionId ?? atsScore.resumeVersion.id;

      const decisionType = RecruiterDecisionService.mapOutcomeToDecision(body.data.outcome);



      const decision = await RecruiterDecisionService.recordDecision({

        resumeId,

        jobId: atsScore.jobId,

        jobSource: "LEGACY_JOB",

        tenantId,

        decision: decisionType,

        decisionReason: noteText,

        atsScoreAtDecision: atsScore.finalScore,

        recruiterId: authedReq.user!.id,

        candidateId: atsScore.application.candidateId,

      });



      AuditLogger.log("RECRUITER_DECISION", {

        tenantId,

        userId: authedReq.user!.id,

        entityId: outcomeSignal.id,

        entityType: "RecruiterOutcomeSignal",

        metadata: {

          outcome: body.data.outcome,

          jobAtsScoreId: body.data.jobAtsScoreId,

          decisionId: decision.id,

        },

        req: authedReq,

      });



      const lastCalibration =

        await RecruiterDecisionService.getLastCalibrationAt(tenantId);

      const since =

        lastCalibration ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const recentCount = await RecruiterDecisionService.countRecentDecisions(

        tenantId,

        since

      );



      let calibrationTriggered = false;

      if (recentCount >= CALIBRATION_DECISION_THRESHOLD) {

        const industry =

          (atsScore.job.industryProfile as IndustryProfile | null) ?? "GENERAL";

        await WeightCalibrationEngine.run(tenantId, industry);

        calibrationTriggered = true;

        AuditLogger.log("CALIBRATION_TRIGGERED", {

          tenantId,

          userId: authedReq.user!.id,

          metadata: { industry, recentCount },

          req: authedReq,

        });

      }



      return NextResponse.json(

        {

          data: {

            decisionId: decision.id,

            outcomeSignalId: outcomeSignal.id,

            calibrationTriggered,

          },

        },

        { status: 201 }

      );

    } catch (error) {

      if (error instanceof ForbiddenError) {

        return NextResponse.json({ error: error.message }, { status: 403 });

      }

      return handleError(error);

    }

  });

}


