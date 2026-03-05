"use client";

import { useState } from "react";
import {
  Github, Linkedin, Globe, Twitter,
  Link2, CheckCircle2, Plus, Loader2, Unlink,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConnectedAccounts } from "@/hooks";
import type { AccountProvider } from "@/lib/api-client";

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderMeta {
  label:       string;
  placeholder: string;
  Icon:        React.FC<{ className?: string }>;
  color:       string;
  bgColor:     string;
  urlPrefix?:  string;   // prepended if user types just a username
}

const PROVIDERS: Record<AccountProvider, ProviderMeta> = {
  GITHUB: {
    label:       "GitHub",
    placeholder: "https://github.com/username",
    Icon:        Github,
    color:       "text-slate-800 dark:text-white",
    bgColor:     "bg-slate-100 dark:bg-slate-800",
    urlPrefix:   "https://github.com/",
  },
  LINKEDIN: {
    label:       "LinkedIn",
    placeholder: "https://linkedin.com/in/username",
    Icon:        Linkedin,
    color:       "text-blue-600",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
    urlPrefix:   "https://linkedin.com/in/",
  },
  HUBSPOT: {
    label:       "HubSpot",
    placeholder: "https://app.hubspot.com/...",
    Icon:        Link2,
    color:       "text-orange-600",
    bgColor:     "bg-orange-50 dark:bg-orange-950",
  },
  PORTFOLIO: {
    label:       "Portfolio",
    placeholder: "https://yourportfolio.com",
    Icon:        Globe,
    color:       "text-violet-600",
    bgColor:     "bg-violet-50 dark:bg-violet-950",
  },
  WEBSITE: {
    label:       "Website",
    placeholder: "https://yourwebsite.com",
    Icon:        Globe,
    color:       "text-emerald-600",
    bgColor:     "bg-emerald-50 dark:bg-emerald-950",
  },
  TWITTER: {
    label:       "Twitter / X",
    placeholder: "https://x.com/username",
    Icon:        Twitter,
    color:       "text-sky-500",
    bgColor:     "bg-sky-50 dark:bg-sky-950",
    urlPrefix:   "https://x.com/",
  },
  KAGGLE: {
    label:       "Kaggle",
    placeholder: "https://kaggle.com/username",
    Icon:        Link2,
    color:       "text-cyan-600",
    bgColor:     "bg-cyan-50 dark:bg-cyan-950",
    urlPrefix:   "https://kaggle.com/",
  },
  LEETCODE: {
    label:       "LeetCode",
    placeholder: "https://leetcode.com/username",
    Icon:        Link2,
    color:       "text-amber-500",
    bgColor:     "bg-amber-50 dark:bg-amber-950",
    urlPrefix:   "https://leetcode.com/",
  },
  GOOGLE: {
    label:       "Google",
    placeholder: "Google account",
    Icon:        Link2,
    color:       "text-blue-500",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
  },
  SLACK: {
    label:       "Slack",
    placeholder: "Slack workspace",
    Icon:        Link2,
    color:       "text-purple-700",
    bgColor:     "bg-purple-50 dark:bg-purple-950",
  },
  ZOOM: {
    label:       "Zoom",
    placeholder: "Zoom account",
    Icon:        Link2,
    color:       "text-blue-600",
    bgColor:     "bg-blue-50 dark:bg-blue-950",
  },
};

// Ordered display
const DISPLAY_ORDER: AccountProvider[] = [
  "GITHUB", "LINKEDIN", "PORTFOLIO", "WEBSITE",
  "TWITTER", "KAGGLE", "LEETCODE", "HUBSPOT",
];

// ─── Connect Dialog ───────────────────────────────────────────────────────────

interface ConnectDialogProps {
  provider:     AccountProvider | null;
  onClose:      () => void;
  existingUrl?: string;
}

function ConnectDialog({ provider, onClose, existingUrl }: ConnectDialogProps) {
  const { connect } = useConnectedAccounts();
  const [url, setUrl] = useState(existingUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!provider) return null;
  const meta = PROVIDERS[provider];

  const handleSave = async () => {
    setError("");
    let profileUrl = url.trim();

    // Auto-prefix if user typed just a username (no http)
    if (meta.urlPrefix && !profileUrl.startsWith("http")) {
      profileUrl = meta.urlPrefix + profileUrl;
    }

    try {
      new URL(profileUrl); // validates
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    setSaving(true);
    try {
      // Extract username from URL for display
      const segments = profileUrl.replace(/\/$/, "").split("/");
      const username = segments[segments.length - 1] || undefined;

      await connect({ provider, profileUrl, username });
      onClose();
    } catch {
      // error toasted by hook
    } finally {
      setSaving(false);
    }
  };

  const { Icon, color, bgColor } = meta;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", bgColor)}>
              <Icon className={cn("h-4 w-4", color)} />
            </span>
            Connect {meta.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ca-url" className="text-sm">Profile URL</Label>
            <Input
              id="ca-url"
              placeholder={meta.placeholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="rounded-xl"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {meta.urlPrefix && (
              <p className="text-xs text-slate-400">
                You can paste a full URL or just your username — we&apos;ll add the prefix.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1 rounded-xl gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {existingUrl ? "Update" : "Connect"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConnectedAccountsSection() {
  const { accounts, isLoading, isConnected, getAccount, disconnect } = useConnectedAccounts();
  const [editing, setEditing] = useState<AccountProvider | null>(null);
  const [disconnecting, setDisconnecting] = useState<AccountProvider | null>(null);

  const handleDisconnect = async (provider: AccountProvider) => {
    setDisconnecting(provider);
    try {
      await disconnect(provider);
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <section>
      <div className="mb-6">
        <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Connected Accounts
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">
          Link external profiles to strengthen your candidate profile.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DISPLAY_ORDER.map((provider) => {
            const meta    = PROVIDERS[provider];
            const account = getAccount(provider);
            const connected = isConnected(provider);
            const { Icon, color, bgColor } = meta;

            return (
              <div
                key={provider}
                className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Icon */}
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", bgColor)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {meta.label}
                    </span>
                    {connected && (
                      <Badge
                        className="h-5 gap-1 rounded-full px-2 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                        variant="outline"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  {connected && account ? (
                    <a
                      href={account.profileUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block max-w-[180px] truncate text-xs text-slate-400 hover:text-primary hover:underline"
                    >
                      {account.username || account.profileUrl}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-400">Not connected</p>
                  )}
                </div>

                {/* Action */}
                {connected ? (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2.5 text-xs"
                      onClick={() => setEditing(provider)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => handleDisconnect(provider)}
                      disabled={disconnecting === provider}
                    >
                      {disconnecting === provider ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><Unlink className="mr-1 h-3 w-3" />Remove</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-xl gap-1 text-xs"
                    onClick={() => setEditing(provider)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!isLoading && accounts.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          {accounts.length} of {DISPLAY_ORDER.length} accounts connected
        </p>
      )}

      {/* Connect/edit dialog */}
      <ConnectDialog
        provider={editing}
        existingUrl={editing ? (getAccount(editing)?.profileUrl ?? "") : ""}
        onClose={() => setEditing(null)}
      />
    </section>
  );
}
