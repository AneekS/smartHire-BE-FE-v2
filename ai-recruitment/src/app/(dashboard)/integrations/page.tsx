"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Plug2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROVIDER_REGISTRY,
  CATEGORIES,
  getByCategory,
  type IntegrationCategory,
} from "@/lib/integrations/providers";
import { integrationsApi } from "@/lib/api-client";
import type { AccountProvider } from "@/lib/api-client";
import { useConnectedAccounts } from "@/hooks";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";


// ─── Success toast ────────────────────────────────────────────────────────────

function SuccessBanner({ provider, onDismiss }: { provider: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      <span>
        <strong>{provider}</strong> connected successfully!
      </span>
      <button
        onClick={onDismiss}
        className="ml-auto text-emerald-400 hover:text-emerald-600 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-400">
      <span>⚠ {message}</span>
      <button
        onClick={onDismiss}
        className="ml-auto text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const { accounts, connect, disconnect, getAccount, isLoading } = useConnectedAccounts();

  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all">("all");
  const [successProvider, setSuccessProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Show success banner when redirected back from OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      setSuccessProvider(connected);
      // Clean the URL silently
      window.history.replaceState({}, "", "/integrations");
    }
    if (error) {
      const messages: Record<string, string> = {
        unknown_provider: "Unknown provider — OAuth not supported.",
        missing_params: "OAuth response was incomplete. Please try again.",
        invalid_state: "Session expired. Please try again.",
        callback_failed: "Connection failed on the provider's side. Please try again.",
      };
      setErrorMsg(messages[error] ?? `OAuth error: ${error}`);
      window.history.replaceState({}, "", "/integrations");
    }
  }, [searchParams]);

  // Filter providers by selected category
  const visibleProviders =
    activeCategory === "all"
      ? PROVIDER_REGISTRY
      : getByCategory(activeCategory);

  // Count connected per category (for badges)
  const totalConnected = accounts?.length ?? 0;

  // ── Connect handler (called by IntegrationCard)
  const handleConnect = useCallback(
    async (config: typeof PROVIDER_REGISTRY[number], values?: Record<string, string>) => {
      setErrorMsg(null);
      if (config.type === "oauth") {
        // Get OAuth URL → redirect browser to it
        const { url } = await integrationsApi.getOAuthUrl(config.id as AccountProvider);
        window.location.href = url;
        return;
      }

      // Manual type — values come from the IntegrationCard inline form
      if (!values) return;
      const profileUrl = values.profileUrl ?? values.url ?? "";
      const username = values.username ?? values.handle ?? values.leetcodeUsername ?? values.kaggleUsername ?? "";

      await connect({
        provider: config.id as AccountProvider,
        profileUrl,
        username: username || undefined,
        isOAuth: false,
      });
    },
    [connect]
  );

  // ── Disconnect handler
  const handleDisconnect = useCallback(
    async (config: typeof PROVIDER_REGISTRY[number]) => {
      setErrorMsg(null);
      if (config.type === "oauth") {
        await integrationsApi.disconnect(config.id as AccountProvider);
        // If connectedAccountsApi wraps SWR, we also need to mutate — call through the hook
        await disconnect(config.id as AccountProvider);
      } else {
        await disconnect(config.id as AccountProvider);
      }
    },
    [disconnect]
  );

  return (
    <>
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Plug2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Integrations
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect your external accounts and tools to enrich your SmartHire profile.
            </p>
          </div>
          <div className="ml-auto">
            {!isLoading && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {totalConnected} connected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Banners ───────────────────────────────────────────────────────── */}
      {successProvider && (
        <div className="mb-6">
          <SuccessBanner
            provider={successProvider}
            onDismiss={() => setSuccessProvider(null)}
          />
        </div>
      )}
      {errorMsg && (
        <div className="mb-6">
          <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
        </div>
      )}

      {/* ─── Category Tabs ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
            activeCategory === "all"
              ? "bg-primary text-white shadow-sm"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
          )}
        >
          All ({PROVIDER_REGISTRY.length})
        </button>
        {CATEGORIES.map(({ id: catId, label: catLabel }) => {
          const providers = getByCategory(catId);
          if (providers.length === 0) return null;
          const connectedCount = providers.filter((p) => !!getAccount(p.id as AccountProvider)).length;
          return (
            <button
              key={catId}
              onClick={() => setActiveCategory(catId)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                activeCategory === catId
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
              )}
            >
              {catLabel}
              {connectedCount > 0 && (
                <span className={cn(
                  "w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center",
                  activeCategory === catId
                    ? "bg-white/30 text-white"
                    : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                )}>
                  {connectedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Grid ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : visibleProviders.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-600">
          <Plug2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No integrations in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleProviders.map((config) => {
            const account = getAccount(config.id as AccountProvider);
            return (
              <IntegrationCard
                key={config.id}
                config={config}
                account={account ?? null}
                onConnect={(values) => handleConnect(config, values)}
                onDisconnect={() => handleDisconnect(config)}
              />
            );
          })}
        </div>
      )}

      {/* ─── Footer note ───────────────────────────────────────────────────── */}
      <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
        Your credentials are stored securely and never shared without your permission.
      </p>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8">
      <Suspense fallback={<div className="animate-pulse h-96 bg-slate-100 dark:bg-slate-900 rounded-2xl" />}>
        <IntegrationsContent />
      </Suspense>
    </div>
  );
}
