/**
 * GET /api/integrations/oauth-url?provider=GITHUB
 *
 * Returns the provider-specific OAuth authorization URL.
 * The frontend redirects the user to this URL to begin the OAuth flow.
 * On completion the provider redirects to /api/integrations/callback/[provider].
 */

import { NextResponse } from "next/server";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

// ─── OAuth URL builders ───────────────────────────────────────────────────────
// Each function returns the full authorization URL for that provider.
// Credentials come from environment variables – never hardcoded.

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function getCallbackUrl(provider: string) {
  return `${APP_URL}/api/integrations/callback/${provider.toLowerCase()}`;
}

function buildUrl(base: string, params: Record<string, string>) {
  return `${base}?${new URLSearchParams(params).toString()}`;
}

function githubUrl(state: string) {
  return buildUrl("https://github.com/login/oauth/authorize", {
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("github"),
    scope: "read:user user:email public_repo",
    state,
  });
}

function linkedinUrl(state: string) {
  return buildUrl("https://www.linkedin.com/oauth/v2/authorization", {
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("linkedin"),
    scope: "r_liteprofile r_emailaddress",
    state,
  });
}

function googleUrl(state: string) {
  return buildUrl("https://accounts.google.com/o/oauth2/v2/auth", {
    response_type: "code",
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("google"),
    scope: "openid profile email",
    access_type: "offline",
    state,
  });
}

function hubspotUrl(state: string) {
  return buildUrl("https://app.hubspot.com/oauth/authorize", {
    client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("hubspot"),
    scope: "crm.objects.contacts.read",
    state,
  });
}

function slackUrl(state: string) {
  return buildUrl("https://slack.com/oauth/v2/authorize", {
    client_id: process.env.SLACK_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("slack"),
    scope: "users:read channels:read",
    state,
  });
}

function zoomUrl(state: string) {
  return buildUrl("https://zoom.us/oauth/authorize", {
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID ?? "",
    redirect_uri: getCallbackUrl("zoom"),
    state,
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

const BUILDERS: Record<string, (state: string) => string> = {
  GITHUB:   githubUrl,
  LINKEDIN: linkedinUrl,
  GOOGLE:   googleUrl,
  HUBSPOT:  hubspotUrl,
  SLACK:    slackUrl,
  ZOOM:     zoomUrl,
};

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const { searchParams } = new URL(authedReq.url);
    const provider = searchParams.get("provider")?.toUpperCase();

    if (!provider || !(provider in BUILDERS)) {
      return NextResponse.json({ error: "Unsupported OAuth provider" }, { status: 400 });
    }

    // State encodes the user email so the callback can identify the candidate
    const state = Buffer.from(
      JSON.stringify({ email: authedReq.user!.email, provider })
    ).toString("base64url");

    const url = BUILDERS[provider](state);
    return NextResponse.json({ url });
  });
}
