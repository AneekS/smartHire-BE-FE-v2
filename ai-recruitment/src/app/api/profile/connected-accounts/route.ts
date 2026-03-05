/**
 * /api/profile/connected-accounts
 *
 * GET    – List all connected accounts for the authenticated candidate
 * POST   – Add (or upsert) a connected account
 * DELETE – Remove a connected account (?provider=GITHUB)
 *
 * OAuth flows (GitHub, LinkedIn, HubSpot) store a placeholder record here and
 * will be extended when NextAuth OAuth providers are configured.
 * Manual links (Portfolio, Kaggle, LeetCode, Twitter) need only a profileUrl.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getOrCreateCandidate } from "@/services/profile/profile.service";
import { prisma } from "@/lib/db";

// ─── Validation ───────────────────────────────────────────────────────────────

const PROVIDER_VALUES = [
  "GITHUB", "LINKEDIN", "HUBSPOT",
  "PORTFOLIO", "WEBSITE", "TWITTER", "KAGGLE", "LEETCODE",
] as const;

type AccountProvider = (typeof PROVIDER_VALUES)[number];

const UpsertSchema = z.object({
  provider:   z.enum(PROVIDER_VALUES),
  profileUrl: z.string().url("Must be a valid URL"),
  username:   z.string().max(100).optional(),
  isOAuth:    z.boolean().optional().default(false),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    const candidate = await getOrCreateCandidate(r.user!.email);
    const accounts = await prisma.connectedAccount.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(accounts);
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const body = await req.json();
      const data = UpsertSchema.parse(body);
      const candidate = await getOrCreateCandidate(r.user!.email);

      const account = await prisma.connectedAccount.upsert({
        where: {
          candidateId_provider: {
            candidateId: candidate.id,
            provider: data.provider as AccountProvider,
          },
        },
        update: {
          profileUrl: data.profileUrl,
          username: data.username ?? null,
          isOAuth: data.isOAuth ?? false,
        },
        create: {
          candidateId: candidate.id,
          provider: data.provider as AccountProvider,
          profileUrl: data.profileUrl,
          username: data.username ?? null,
          isOAuth: data.isOAuth ?? false,
        },
      });

      return NextResponse.json(account, { status: 201 });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: e.issues.map((i) => i.message).join(", ") },
          { status: 400 }
        );
      }
      const msg = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (r) => {
    try {
      const { searchParams } = new URL(req.url);
      const provider = searchParams.get("provider")?.toUpperCase();

      if (!provider || !PROVIDER_VALUES.includes(provider as AccountProvider)) {
        return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
      }

      const candidate = await getOrCreateCandidate(r.user!.email);

      await prisma.connectedAccount.deleteMany({
        where: {
          candidateId: candidate.id,
          provider: provider as AccountProvider,
        },
      });

      return NextResponse.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
