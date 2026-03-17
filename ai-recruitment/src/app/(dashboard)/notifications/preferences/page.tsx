"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { toast } from "sonner";

type BooleanPreferenceKey =
  | "inAppEnabled"
  | "emailEnabled"
  | "jobAlerts"
  | "interviewAlerts"
  | "careerAlerts"
  | "recruiterActivityAlerts"
  | "communityAlerts"
  | "applicationAlerts"
  | "reminderAlerts";

interface PreferenceSetting {
  key: BooleanPreferenceKey;
  label: string;
  description: string;
  icon: string;
}

const CHANNEL_SETTINGS: PreferenceSetting[] = [
  {
    key: "inAppEnabled",
    label: "In-App Notifications",
    description: "Show notifications inside SmartHire",
    icon: "🖥️",
  },
  {
    key: "emailEnabled",
    label: "Email Notifications",
    description: "Send notifications to your email",
    icon: "📧",
  },
];

const CATEGORY_SETTINGS: PreferenceSetting[] = [
  {
    key:         "applicationAlerts",
    label:       "Application Updates",
    description: "Status changes, shortlisting, and offer notifications",
    icon:        "📋",
  },
  {
    key:         "interviewAlerts",
    label:       "Interview Alerts",
    description: "Scheduled, rescheduled, and reminder notifications",
    icon:        "🎤",
  },
  {
    key:         "jobAlerts",
    label:       "Job Alerts",
    description: "New matches, daily digest, and deadline alerts",
    icon:        "💼",
  },
  {
    key:         "careerAlerts",
    label:       "Career Growth",
    description: "Skill gaps, learning paths, and readiness updates",
    icon:        "🚀",
  },
  {
    key:         "recruiterActivityAlerts",
    label:       "Recruiter Activity",
    description: "Profile views, resume downloads, and messages",
    icon:        "👁️",
  },
  {
    key:         "communityAlerts",
    label:       "Community",
    description: "Posts, replies, and trending companies",
    icon:        "🌐",
  },
  {
    key:         "reminderAlerts",
    label:       "Reminders",
    description: "Profile completion, saved jobs, and inactivity nudges",
    icon:        "⏰",
  },
];

export default function NotificationPreferencesPage() {
  const { preferences, isLoading, saving, updatePreferences } = useNotificationPreferences();

  async function handleToggle(
    key: PreferenceSetting["key"],
    value: boolean,
  ) {
    await updatePreferences({ [key]: value });
    toast.success("Preferences updated");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">Notification Preferences</h1>
            <p className="text-xs text-slate-500">Control how and when SmartHire notifies you</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Channels */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Notification Channels
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {CHANNEL_SETTINGS.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{setting.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{setting.label}</p>
                    <p className="text-xs text-slate-500">{setting.description}</p>
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full" />
                ) : (
                  <Switch
                    checked={preferences?.[setting.key] ?? true}
                    disabled={saving}
                    onCheckedChange={(v) => void handleToggle(setting.key, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Notification Categories
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {CATEGORY_SETTINGS.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{setting.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{setting.label}</p>
                    <p className="text-xs text-slate-500">{setting.description}</p>
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full" />
                ) : (
                  <Switch
                    checked={preferences?.[setting.key] ?? true}
                    disabled={saving}
                    onCheckedChange={(v) => void handleToggle(setting.key, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
