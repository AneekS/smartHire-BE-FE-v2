/**
 * GET /api/integrations/callback/[provider]
 *
 * OAuth 2.0 callback handler.
 * Exchanges the authorization code for tokens, then upserts the
 * corresponding ConnectedAccount row, and finally redirects the user
 * back to /integrations with a ?connected=<PROVIDER> query string.
 *
 * All OAuth credentials come from environment variables.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OAuthState {
  email: string;
  provider: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function getCallbackUrl(provider: string) {
  return `${APP_URL}/api/integrations/callback/${provider.toLowerCase()}`;
}

function decodeState(raw: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as OAuthState;
  } catch {
    return null;
  }
}

function expiresAtFromNow(expiresIn?: number): Date | undefined {
  if (!expiresIn) return undefined;
  return new Date(Date.now() + expiresIn * 1000);
}

// ─── Provider-specific token exchange ─────────────────────────────────────────

type ProviderTokenExchange = (
  code: string,
  redirectUri: string
) => Promise<{ tokens: TokenResponse; profile: { username?: string; profileUrl?: string } }>;

async function exchangeGitHub(code: string, redirectUri: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokens = (await res.json()) as TokenResponse;

  // Fetch user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokens.access_token}`, "User-Agent": "SmartHire" },
  });
  const user = (await userRes.json()) as { login?: string; html_url?: string };
  return { tokens, profile: { username: user.login, profileUrl: user.html_url } };
}

async function exchangeLinkedIn(code: string, redirectUri: string) {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    }),
  });
  const tokens = (await res.json()) as TokenResponse;

  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = (await profileRes.json()) as { id?: string };
  return {
    tokens,
    profile: {
      username: profile.id,
      profileUrl: profile.id ? `https://www.linkedin.com/in/${profile.id}` : undefined,
    },
  };
}

async function exchangeGoogle(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  });
  const tokens = (await res.json()) as TokenResponse;

  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userinfo = (await userinfoRes.json()) as { email?: string; sub?: string };
  return {
    tokens,
    profile: { username: userinfo.email, profileUrl: undefined },
  };
}

async function exchangeHubSpot(code: string, redirectUri: string) {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
    }),
  });
  const tokens = (await res.json()) as TokenResponse;
  return { tokens, profile: {} };
}

async function exchangeSlack(code: string, redirectUri: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    team?: { name?: string; id?: string };
  };
  const tokens: TokenResponse = { access_token: data.access_token ?? "" };
  if (data.refresh_token) tokens.refresh_token = data.refresh_token;
  return {
    tokens,
    profile: { username: data.team?.name, profileUrl: undefined },
  };
}

async function exchangeZoom(code: string, redirectUri: string) {
  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokens = (await res.json()) as TokenResponse;

  const profileRes = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profileData = (await profileRes.json()) as { email?: string };
  return { tokens, profile: { username: profileData.email, profileUrl: undefined } };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const EXCHANGERS: Record<string, ProviderTokenExchange> = {
  github:   exchangeGitHub,
  linkedin: exchangeLinkedIn,
  google:   exchangeGoogle,
  hubspot:  exchangeHubSpot,
  slack:    exchangeSlack,
  zoom:     exchangeZoom,
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const providerKey = rawProvider.toLowerCase();
  const exchanger = EXCHANGERS[providerKey];

  // ── Validate provider
  if (!exchanger) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=unknown_provider`);
  }

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const rawState = searchParams.get("state");

  if (!code || !rawState) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=missing_params`);
  }

  // ── Decode state (contains the user email for identification)
  const state = decodeState(rawState);
  if (!state?.email) {
    return NextResponse.redirect(`${APP_URL}/integrations?error=invalid_state`);
  }

  try {
    const redirectUri = getCallbackUrl(providerKey);
    const { tokens, profile } = await exchanger(code, redirectUri);

    // Resolve candidate
    const candidate = await getOrCreateCandidate(state.email);

    const providerEnum = providerKey.toUpperCase() as (
      | "GITHUB" | "LINKEDIN" | "GOOGLE" | "HUBSPOT" | "SLACK" | "ZOOM"
    );

    // Upsert ConnectedAccount
    await prisma.connectedAccount.upsert({
      where: {
        candidateId_provider: { candidateId: candidate.id, provider: providerEnum },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAtFromNow(tokens.expires_in) ?? null,
        scopes: tokens.scope ? tokens.scope.split(/[\s,]+/) : [],
        isOAuth: true,
        username: profile.username ?? null,
        profileUrl: profile.profileUrl ?? "",
        updatedAt: new Date(),
      },
      create: {
        candidateId: candidate.id,
        provider: providerEnum,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAtFromNow(tokens.expires_in) ?? null,
        scopes: tokens.scope ? tokens.scope.split(/[\s,]+/) : [],
        isOAuth: true,
        username: profile.username ?? null,
        profileUrl: profile.profileUrl ?? "",
      },
    });

    return NextResponse.redirect(
      `${APP_URL}/integrations?connected=${providerKey.toUpperCase()}`
    );
  } catch (err) {
    console.error(`[OAuth callback] ${providerKey} failed:`, err);
    return NextResponse.redirect(`${APP_URL}/integrations?error=callback_failed`);
  }
}
