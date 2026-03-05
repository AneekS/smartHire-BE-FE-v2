/**
 * Provider Registry
 * ─────────────────
 * Central definition of every integration SmartHire supports.
 * To add a new integration, add ONE entry here – nothing else changes.
 *
 * Type legend:
 *  "oauth"  – full OAuth 2.0 flow (user is redirected to provider)
 *  "manual" – user pastes a URL / username into a form field
 */

import type { AccountProvider } from "@/lib/api-client";

// ─── Category labels ──────────────────────────────────────────────────────────

export type IntegrationCategory =
  | "developer"
  | "professional"
  | "communication"
  | "productivity"
  | "data-science"
  | "other";

// ─── Manual field config ──────────────────────────────────────────────────────

export interface ManualField {
  key:         string;
  label:       string;
  placeholder: string;
  type?:       "url" | "text";
  urlPrefix?:  string; // prepend if user types just a username
}

// ─── Provider config ──────────────────────────────────────────────────────────

export interface ProviderConfig {
  id:          AccountProvider;
  name:        string;
  description: string;
  category:    IntegrationCategory;
  type:        "oauth" | "manual";

  // Visual
  iconUrl:     string; // path to SVG in /public/icons/integrations/
  brandColor:  string; // used for hover/active backgrounds
  textColor:   string;
  bgColor:     string;

  // OAuth only
  oauthScopes?: string[];

  // Manual only  
  manualFields?: ManualField[];

  // Optional
  docsUrl?:    string;
  featured?:   boolean; // pinned at the top of the grid
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  // ── Developer ──────────────────────────────────────────────────────────────
  {
    id:          "GITHUB",
    name:        "GitHub",
    description: "Display your repositories, contributions, and open-source work.",
    category:    "developer",
    type:        "oauth",
    iconUrl:     "/icons/integrations/github.svg",
    brandColor:  "#24292e",
    textColor:   "text-slate-800 dark:text-white",
    bgColor:     "bg-slate-100 dark:bg-slate-800",
    oauthScopes: ["read:user", "user:email", "public_repo"],
    docsUrl:     "https://docs.github.com/en/apps/oauth-apps",
    featured:    true,
  },
  {
    id:          "KAGGLE",
    name:        "Kaggle",
    description: "Link your Kaggle profile to highlight data science competitions.",
    category:    "data-science",
    type:        "manual",
    iconUrl:     "/icons/integrations/kaggle.svg",
    brandColor:  "#20beff",
    textColor:   "text-cyan-600",
    bgColor:     "bg-cyan-50 dark:bg-cyan-950",
    manualFields: [
      {
        key:         "profileUrl",
        label:       "Kaggle Profile URL",
        placeholder: "https://kaggle.com/username",
        type:        "url",
        urlPrefix:   "https://kaggle.com/",
      },
    ],
  },
  {
    id:          "LEETCODE",
    name:        "LeetCode",
    description: "Showcase your competitive programming skills and solutions.",
    category:    "developer",
    type:        "manual",
    iconUrl:     "/icons/integrations/leetcode.svg",
    brandColor:  "#ffa116",
    textColor:   "text-amber-500",
    bgColor:     "bg-amber-50 dark:bg-amber-950",
    manualFields: [
      {
        key:         "profileUrl",
        label:       "LeetCode Profile URL",
        placeholder: "https://leetcode.com/username",
        type:        "url",
        urlPrefix:   "https://leetcode.com/",
      },
    ],
  },

  // ── Professional ───────────────────────────────────────────────────────────
  {
    id:          "LINKEDIN",
    name:        "LinkedIn",
    description: "Connect your LinkedIn to auto-populate work history and endorsements.",
    category:    "professional",
    type:        "oauth",
    iconUrl:     "/icons/integrations/linkedin.svg",
    brandColor:  "#0077b5",
    textColor:   "text-blue-600",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
    oauthScopes: ["r_liteprofile", "r_emailaddress"],
    docsUrl:     "https://learn.microsoft.com/en-us/linkedin/shared/authentication/",
    featured:    true,
  },
  {
    id:          "GOOGLE",
    name:        "Google",
    description: "Sign in with Google to sync your calendar and credentials.",
    category:    "professional",
    type:        "oauth",
    iconUrl:     "/icons/integrations/google.svg",
    brandColor:  "#4285f4",
    textColor:   "text-blue-500",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
    oauthScopes: ["openid", "profile", "email"],
    docsUrl:     "https://developers.google.com/identity/protocols/oauth2",
    featured:    true,
  },
  {
    id:          "HUBSPOT",
    name:        "HubSpot",
    description: "Integrate with HubSpot CRM for recruiter outreach tracking.",
    category:    "professional",
    type:        "oauth",
    iconUrl:     "/icons/integrations/hubspot.svg",
    brandColor:  "#ff7a59",
    textColor:   "text-orange-600",
    bgColor:     "bg-orange-50 dark:bg-orange-950",
    oauthScopes: ["crm.objects.contacts.read"],
    docsUrl:     "https://developers.hubspot.com/docs/api/oauth-quickstart-guide",
  },
  {
    id:          "TWITTER",
    name:        "Twitter / X",
    description: "Link your Twitter / X profile for social proof and visibility.",
    category:    "professional",
    type:        "manual",
    iconUrl:     "/icons/integrations/twitter.svg",
    brandColor:  "#1da1f2",
    textColor:   "text-sky-500",
    bgColor:     "bg-sky-50 dark:bg-sky-950",
    manualFields: [
      {
        key:         "profileUrl",
        label:       "Twitter / X Profile URL",
        placeholder: "https://x.com/username",
        type:        "url",
        urlPrefix:   "https://x.com/",
      },
    ],
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id:          "SLACK",
    name:        "Slack",
    description: "Connect Slack to receive job match alerts and recruiter messages.",
    category:    "communication",
    type:        "oauth",
    iconUrl:     "/icons/integrations/slack.svg",
    brandColor:  "#4a154b",
    textColor:   "text-purple-700",
    bgColor:     "bg-purple-50 dark:bg-purple-950",
    oauthScopes: ["users:read", "channels:read"],
    docsUrl:     "https://api.slack.com/authentication/oauth-v2",
  },
  {
    id:          "ZOOM",
    name:        "Zoom",
    description: "Enable Zoom links for interview scheduling directly from SmartHire.",
    category:    "communication",
    type:        "oauth",
    iconUrl:     "/icons/integrations/zoom.svg",
    brandColor:  "#2d8cff",
    textColor:   "text-blue-500",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
    oauthScopes: ["meeting:write:admin", "user:read:admin"],
    docsUrl:     "https://developers.zoom.us/docs/integrations/oauth/",
  },

  // ── Portfolio / Website ───────────────────────────────────────────────────
  {
    id:          "PORTFOLIO",
    name:        "Portfolio",
    description: "Add your portfolio site to show recruiters your best work.",
    category:    "other",
    type:        "manual",
    iconUrl:     "/icons/integrations/portfolio.svg",
    brandColor:  "#7c3aed",
    textColor:   "text-violet-600",
    bgColor:     "bg-violet-50 dark:bg-violet-950",
    manualFields: [
      {
        key:         "profileUrl",
        label:       "Portfolio URL",
        placeholder: "https://yourportfolio.com",
        type:        "url",
      },
    ],
    featured: true,
  },
  {
    id:          "WEBSITE",
    name:        "Personal Website",
    description: "Link your personal website or blog.",
    category:    "other",
    type:        "manual",
    iconUrl:     "/icons/integrations/website.svg",
    brandColor:  "#059669",
    textColor:   "text-emerald-600",
    bgColor:     "bg-emerald-50 dark:bg-emerald-950",
    manualFields: [
      {
        key:         "profileUrl",
        label:       "Website URL",
        placeholder: "https://yoursite.com",
        type:        "url",
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Look up a single provider by its id */
export function getProvider(id: AccountProvider): ProviderConfig | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === id);
}

/** All providers in a given category */
export function getByCategory(cat: IntegrationCategory): ProviderConfig[] {
  return PROVIDER_REGISTRY.filter((p) => p.category === cat);
}

/** Featured / pinned providers */
export const FEATURED = PROVIDER_REGISTRY.filter((p) => p.featured);

/** Ordered list of categories for display */
export const CATEGORIES: { id: IntegrationCategory; label: string }[] = [
  { id: "developer",      label: "Developer"       },
  { id: "professional",   label: "Professional"    },
  { id: "communication",  label: "Communication"   },
  { id: "productivity",   label: "Productivity"    },
  { id: "data-science",   label: "Data Science"    },
  { id: "other",          label: "Other"           },
];
