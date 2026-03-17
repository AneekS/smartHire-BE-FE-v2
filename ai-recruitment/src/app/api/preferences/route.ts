import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { NextResponse } from "next/server";
import { auth } from "@insforge/nextjs/server";
import { prisma } from "@/lib/db";
import {
  listPreferencesController,
  updatePreferenceController,
} from "@/modules/preferences/controllers/preferences.controller";
import { getUserPreference } from "@/modules/preferences/services/preference.service";
import { createNotification } from "@/modules/notifications/services/notification.service";
import { enqueueRoleFitScoreUpdate } from "@/services/queue-producers";
import { withRequestId } from "@/lib/middleware/requestId";
import { retry } from "@/lib/utils/retry";

let preferenceSaveFailures = 0;

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toEnumString<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T[number];
  }
  return fallback;
}

export async function POST(req: AuthenticatedRequest) {
  const requestId = req.requestId ?? withRequestId(req);
  req.requestId = requestId;

  return withAuth(req, async (authedReq) => {
    const start = Date.now();

    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      const userId = authedReq.user?.id;

      if (!userId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized", requestId },
          { status: 401 },
        );
      }

      console.log(`[${requestId}] [PREFERENCES SAVE] userId:`, userId);

      const user = await retry(() => prisma.user.findUnique({ where: { id: userId } }));
      if (!user) {
        console.error(`[${requestId}] [CRITICAL] User missing in DB:`, userId);
        preferenceSaveFailures += 1;
        return NextResponse.json(
          { success: false, error: "User not initialized. Please re-login.", requestId },
          { status: 409 },
        );
      }

      const secondaryRoles = toStringArray(body.secondaryRoles);
      const exploratoryRoles = toStringArray(body.exploratoryRoles);
      const preferredIndustries = toStringArray(body.preferredIndustries);
      const preferredWorkTypes = toStringArray(body.preferredWorkTypes);
      const legacyWorkType = typeof body.workType === "string" ? [body.workType] : [];
      const preferredLocations = toStringArray(body.preferredLocations);
      const legacyLocations = toStringArray(body.locationPreference);

      const salaryMin = toNumberOrNull(body.salaryMin) ?? 0;
      const salaryTargetRaw = toNumberOrNull(body.salaryTarget) ?? salaryMin;
      const salaryTarget = Math.max(salaryMin, salaryTargetRaw);
      const salaryMaxRaw = toNumberOrNull(body.salaryMax) ?? salaryTarget;
      const salaryMax = Math.max(salaryTarget, salaryMaxRaw);

      const data = {
        primaryRole: typeof body.primaryRole === "string" ? body.primaryRole.trim() : "",
        secondaryRoles,
        exploratoryRoles,
        experienceLevel: toEnumString(body.experienceLevel, ["ENTRY", "MID", "SENIOR", "LEAD"] as const, "MID"),
        preferredIndustries,
        preferredWorkTypes: (preferredWorkTypes.length > 0 ? preferredWorkTypes : legacyWorkType)
          .filter((item) => ["REMOTE", "HYBRID", "ONSITE", "CONTRACT", "FREELANCE"].includes(item)) as Array<"REMOTE" | "HYBRID" | "ONSITE" | "CONTRACT" | "FREELANCE">,
        preferredLocations: preferredLocations.length > 0 ? preferredLocations : legacyLocations,
        salaryMin,
        salaryTarget,
        salaryMax,
        salaryVisibility: toEnumString(body.salaryVisibility, ["PUBLIC", "RANGE_ONLY", "PRIVATE"] as const, "RANGE_ONLY"),
      };

      const preference = await retry(() =>
        prisma.userPreference.upsert({
          where: { userId },
          update: data,
          create: {
            userId,
            ...data,
          },
        }),
      );

      void createNotification({
        userId,
        eventType: "PREFERENCE_UPDATE",
        title: "Preferences Updated",
        message: "Your job preferences have been updated successfully.",
        userEmail: authedReq.user?.email,
      });

      void enqueueRoleFitScoreUpdate(userId);

      console.log(`[${requestId}] Completed in ${Date.now() - start}ms`);

      return NextResponse.json({
        success: true,
        preference,
        requestId,
      });
    } catch (error) {
      preferenceSaveFailures += 1;
      console.error(`[${requestId}] [PREFERENCES ERROR]`, error, {
        preference_save_failures: preferenceSaveFailures,
      });
      console.log(`[${requestId}] Completed in ${Date.now() - start}ms`);
      return NextResponse.json(
        { success: false, error: "Internal server error", requestId },
        { status: 500 },
      );
    }
  });
}

export async function GET(req: AuthenticatedRequest) {
  const requestId = req.requestId ?? withRequestId(req);
  try {
    const { user } = await auth();

    if (!user?.id) {
      return NextResponse.json({
        success: true,
        data: {},
        preference: null,
        authenticated: false,
        requestId,
      });
    }

    const url = new URL(req.url);
    const role = (user as { user_metadata?: { role?: string } }).user_metadata?.role ?? "CANDIDATE";
    const isAdminList = url.searchParams.get("list") === "true" && role === "ADMIN";

    console.log(`[${requestId}] [GET /api/preferences] Fetching preferences for user:`, user.id);

    if (isAdminList) {
      return listPreferencesController(url.searchParams);
    }

    const preference = await getUserPreference(user.id);

    return NextResponse.json({
      success: true,
      data: preference ?? {},
      preference: preference ?? null,
      authenticated: true,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] [GET /api/preferences] Failed to fetch preferences`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch preferences", data: {}, preference: null, requestId },
      { status: 500 },
    );
  }
}

export async function PATCH(req: AuthenticatedRequest) {
  const requestId = req.requestId ?? withRequestId(req);
  req.requestId = requestId;

  return withAuth(req, async (authedReq) => {
    const start = Date.now();
    console.log(`[${requestId}] [PREFERENCES SAVE] userId:`, authedReq.user!.id);

    const user = await retry(() => prisma.user.findUnique({ where: { id: authedReq.user!.id } }));
    if (!user) {
      console.error(`[${requestId}] [CRITICAL] User missing in DB:`, authedReq.user!.id);
      preferenceSaveFailures += 1;
      return NextResponse.json(
        { success: false, error: "User not initialized. Please re-login.", requestId },
        { status: 409 },
      );
    }

    const body = await req.json();
    const response = await updatePreferenceController(authedReq.user!.id, body);

    if (response.ok) {
      void createNotification({
        userId: authedReq.user!.id,
        eventType: "PREFERENCE_UPDATE",
        title: "Preferences Updated",
        message: "Your job preferences have been updated successfully.",
        userEmail: authedReq.user?.email,
      });
    }

    void enqueueRoleFitScoreUpdate(authedReq.user!.id);
    console.log(`[${requestId}] Completed in ${Date.now() - start}ms`);
    return response;
  });
}
