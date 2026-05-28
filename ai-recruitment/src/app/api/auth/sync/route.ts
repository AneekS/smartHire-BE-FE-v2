import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureApplicationUser, UnauthorizedError } from "@/lib/ensure-application-user";

/**
 * Pulls the signed-in Clerk user into Postgres (User + Candidate).
 * No Clerk webhooks required — call once after sign-in / on dashboard load.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureApplicationUser(clerkId, { forceSync: true });

    return NextResponse.json({
      synced: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        candidateId: user.candidate?.id ?? null,
      },
    });
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
