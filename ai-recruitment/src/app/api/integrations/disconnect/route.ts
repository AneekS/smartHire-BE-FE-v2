/**
 * DELETE /api/integrations/disconnect?provider=GITHUB
 *
 * Removes an OAuth integration for the authenticated candidate.
 * Manual-link accounts should use DELETE /api/profile/connected-accounts.
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { getOrCreateCandidate } from "@/services/profile/profile.service";
import type { AccountProvider } from "@prisma/client";

const OAUTH_PROVIDERS = new Set([
  "GITHUB", "LINKEDIN", "GOOGLE", "HUBSPOT", "SLACK", "ZOOM",
]);

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const { searchParams } = new URL(authedReq.url);
    const provider = searchParams.get("provider")?.toUpperCase();

    if (!provider || !OAUTH_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Unsupported integration provider" }, { status: 400 });
    }

    const candidate = await getOrCreateCandidate(authedReq.user!.email);

    // Delete if exists — no-op if not
    await prisma.connectedAccount.deleteMany({
      where: {
        candidateId: candidate.id,
        provider: provider as AccountProvider,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
