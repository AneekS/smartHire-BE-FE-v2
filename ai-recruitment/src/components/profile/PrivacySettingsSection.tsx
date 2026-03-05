"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, Lock, User, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivacy } from "@/hooks";

interface PrivacyToggleProps {
  icon:    React.ReactNode;
  title:   string;
  description: string;
  checked: boolean;
  onToggle: () => Promise<void>;
  danger?: boolean;
}

function PrivacyToggle({ icon, title, description, checked, onToggle, danger }: PrivacyToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try { await onToggle(); }
    finally { setLoading(false); }
  };

  return (
    <div className={`flex items-center justify-between rounded-xl p-4 ${danger && checked ? "bg-red-50 dark:bg-red-900/10" : "bg-slate-50 dark:bg-slate-800/50"} transition-colors`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ${danger ? "bg-red-100 text-red-500 dark:bg-red-900/30" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}>
          {icon}
        </div>
        <div>
          <h5 className="font-semibold text-sm text-slate-900 dark:text-white">{title}</h5>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <Switch
            checked={checked}
            onCheckedChange={handleToggle}
            className={danger && checked ? "data-[state=checked]:bg-red-500" : ""}
          />
        )}
      </div>
    </div>
  );
}

export function PrivacySettingsSection() {
  const { privacy, isLoading, update } = usePrivacy();

  if (isLoading) return (
    <section>
      <div className="mb-6"><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
      <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    </section>
  );

  const visibilityLabel = privacy.anonymousMode ? "Anonymous" : privacy.isPublic ? "Public" : "Private";
  const visibilityColor = privacy.anonymousMode ? "bg-slate-100 text-slate-600" : privacy.isPublic ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600";

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Privacy Settings
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Control who can see your profile and information</p>
        </div>
        <Badge className={`text-xs font-bold ${visibilityColor}`}>{visibilityLabel}</Badge>
      </div>

      <div className="space-y-3">
        <PrivacyToggle
          icon={<Eye className="h-4 w-4" />}
          title="Public Profile"
          description="Your profile is visible to everyone, including search engines and public pages."
          checked={privacy.isPublic ?? true}
          onToggle={() => update({ isPublic: !privacy.isPublic })}
        />
        <PrivacyToggle
          icon={<User className="h-4 w-4" />}
          title="Visible to Recruiters"
          description="Allow verified recruiters on SmartHire to find and contact you."
          checked={privacy.visibleToRecruiters ?? true}
          onToggle={() => update({ visibleToRecruiters: !privacy.visibleToRecruiters })}
        />
        <PrivacyToggle
          icon={<EyeOff className="h-4 w-4" />}
          title="Anonymous Mode"
          description="Hide your name and photo. Recruiters see your skills and experience only."
          checked={privacy.anonymousMode ?? false}
          onToggle={() => update({ anonymousMode: !privacy.anonymousMode })}
          danger
        />
        <PrivacyToggle
          icon={<Lock className="h-4 w-4" />}
          title="Hide Contact Information"
          description="Protect your email and phone number. Recruiters must send messages through the platform."
          checked={privacy.hideContactInfo ?? false}
          onToggle={() => update({ hideContactInfo: !privacy.hideContactInfo })}
          danger
        />
      </div>

      {privacy.anonymousMode && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Anonymous mode is active.</strong> Your identity is hidden from recruiters. You can still apply to jobs but recruiters won&apos;t see your name or photo.
          </p>
        </div>
      )}
    </section>
  );
}
