import { NextResponse } from "next/server";
import { ensureApplicationUser, UnauthorizedError } from "@/lib/ensure-application-user";
/**
 * Pulls the signed-in Clerk user into Postgres (User + Candidate).
 * GET kept for ClerkDatabaseSync; POST per Phase 5 spec.
 */
async function syncHandler(forceSync: boolean) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await ensureApplicationUser(clerkId, { forceSync });

  return NextResponse.json({
    synced: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      candidateId: user.candidate?.id ?? null,
      tenantId: user.tenantId ?? null,
    },
  });
}

export async function GET() {
  try {
    return await syncHandler(true);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[GET /api/auth/sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await syncHandler(true);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error("[POST /api/auth/sync]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
