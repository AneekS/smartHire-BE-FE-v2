import { prisma } from "@/lib/prisma";
import { sendOpsAlert } from "@/lib/ops-alerts";
import type { Notification, NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  static async create(input: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        type: input.type,
        title: input.title,
        message: input.body,
        body: input.body,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata ? (input.metadata as object) : undefined,
      },
    });
  }

  static async notifyAtsScoreComplete(input: {
    userId: string;
    tenantId: string;
    scoreId: string | null;
    finalScore: number;
    jobId: string;
  }): Promise<Notification | null> {
    if (!input.scoreId) return null;

    return NotificationService.create({
      userId: input.userId,
      tenantId: input.tenantId,
      type: "SYSTEM",
      title: "ATS score ready",
      body: `Your match score for this role is ${Math.round(input.finalScore)}.`,
      entityId: input.scoreId,
      entityType: "ApplicationAtsScore",
      metadata: { jobId: input.jobId, finalScore: input.finalScore },
    });
  }

  static async notifyCalibrationComplete(input: {
    tenantId: string;
    calibrationId: string;
    industryProfile: string;
  }): Promise<Notification[]> {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", tenantId: input.tenantId },
      select: { id: true },
    });

    const notifications: Notification[] = [];
    for (const admin of admins) {
      const row = await NotificationService.create({
        userId: admin.id,
        tenantId: input.tenantId,
        type: "SYSTEM",
        title: "Weight calibration updated",
        body: `Calibration completed for ${input.industryProfile}.`,
        entityId: input.calibrationId,
        entityType: "WeightCalibration",
        metadata: { industryProfile: input.industryProfile },
      });
      notifications.push(row);
    }

    if (notifications.length > 0) {
      await sendOpsAlert({
        subject: `Calibration completed (${input.industryProfile})`,
        body: `Tenant ${input.tenantId}: new weight calibration ${input.calibrationId}.`,
        severity: "info",
      });
    }

    return notifications;
  }
}
