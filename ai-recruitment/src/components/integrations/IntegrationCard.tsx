"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Link2, Unlink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProviderConfig } from "@/lib/integrations/providers";
import type { ConnectedAccount } from "@/lib/api-client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface IntegrationCardProps {
  config: ProviderConfig;
  account: ConnectedAccount | null;
  /** Called when user confirms an OAuth or manual connect */
  onConnect: (data?: Record<string, string>) => Promise<void>;
  /** Called when user confirms disconnect */
  onDisconnect: () => Promise<void>;
}

// ─── Manual link form  ────────────────────────────────────────────────────────

function ManualForm({
  config,
  onSave,
  onCancel,
}: {
  config: ProviderConfig;
  onSave: (values: Record<string, string>) => Promise<void>;
  onCancel: () => void;
}) {
  const fields = config.manualFields ?? [];
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSave() {
    // Basic validation: all fields must have a value
    const empty = fields.filter((f) => !values[f.key]?.trim());
    if (empty.length > 0) {
      setError(`Please fill in: ${empty.map((f) => f.label).join(", ")}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label htmlFor={field.key} className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {field.label}
          </Label>
          <div className="flex items-center gap-1">
            {field.urlPrefix && (
              <span className="text-xs text-slate-400 whitespace-nowrap">{field.urlPrefix}</span>
            )}
            <Input
              id={field.key}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      ))}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs px-3">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-xs px-3">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function IntegrationCard({ config, account, onConnect, onDisconnect }: IntegrationCardProps) {
  const [showForm, setShowForm]         = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const isConnected = !!account;

  async function handleOAuthConnect() {
    setConnecting(true);
    setError(null);
    try {
      await onConnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setConnecting(false);
    }
    // If OAuth, the page will redirect — loading stays visible
  }

  async function handleManualSave(values: Record<string, string>) {
    await onConnect(values);
    setShowForm(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      await onDisconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div
      className={cn(
        "relative bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200",
        isConnected
          ? "border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-50 dark:shadow-emerald-950"
          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"
      )}
    >
      {/* Connected ribbon */}
      {isConnected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Icon container */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold select-none"
          style={{ backgroundColor: config.bgColor, color: config.brandColor }}
        >
          {config.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.iconUrl} alt={config.name} className="w-6 h-6 object-contain" />
          ) : (
            config.name[0]
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {config.name}
            </h3>
            {config.featured && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                Popular
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{config.category}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        {config.description}
      </p>

      {/* Connected account info */}
      {isConnected && account.username && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
            {account.username}
          </span>
          {account.profileUrl && (
            <a
              href={account.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex-shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}

      {/* Manual form */}
      {showForm && config.type === "manual" && (
        <ManualForm
          config={config}
          onSave={handleManualSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Actions */}
      {!showForm && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          {isConnected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="h-7 text-xs px-2.5 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            >
              {disconnecting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Unlink className="w-3 h-3 mr-1" />
              )}
              Disconnect
            </Button>
          ) : config.type === "oauth" ? (
            <Button
              size="sm"
              onClick={handleOAuthConnect}
              disabled={connecting}
              className="h-7 text-xs px-3"
              style={{ backgroundColor: config.brandColor, color: config.textColor }}
            >
              {connecting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Link2 className="w-3 h-3 mr-1" />
              )}
              Connect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="h-7 text-xs px-3"
            >
              <Link2 className="w-3 h-3 mr-1" />
              Add Link
            </Button>
          )}

          {config.docsUrl && (
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-slate-400 hover:text-primary transition-colors flex items-center gap-0.5"
            >
              Docs <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
