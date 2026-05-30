import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLogger } from "@/monitoring/logger";

export type AuditAction =
  | "RESUME_UPLOADED"
  | "ATS_SCORE_COMPUTED"
  | "RECRUITER_DECISION"
  | "RECRUITER_OUTCOME_RECORDED"
  | "CALIBRATION_TRIGGERED"
  | "ADMIN_ACCESS"
  | "PII_ACCESSED";

export interface AuditLogInput {
  tenantId: string;
  userId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: Record<string, unknown> | null;
  req?: NextRequest | Pick<NextRequest, "headers">;
}

function extractRequestMeta(req?: AuditLogInput["req"]) {
  if (!req) return { ipAddress: null as string | null, userAgent: null as string | null };
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");
  return { ipAddress, userAgent };
}

export class AuditLogger {
  static async logWithClient(
    client: Prisma.TransactionClient | typeof prisma,
    action: AuditAction,
    input: AuditLogInput
  ): Promise<void> {
    const { ipAddress, userAgent } = extractRequestMeta(input.req);
    await client.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        action,
        entityId: input.entityId ?? null,
        entityType: input.entityType ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress,
        userAgent,
      },
    });
  }

  /** Fire-and-forget audit write; never throws to caller. */
  static log(action: AuditAction, input: AuditLogInput): void {
    void AuditLogger.logWithClient(prisma, action, input).catch((err) => {
      getLogger().warn({ err, action, tenantId: input.tenantId }, "AuditLogger failed");
    });
  }
}
