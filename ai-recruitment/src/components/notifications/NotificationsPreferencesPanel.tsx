"use client";

import { Archive, CheckCheck, RefreshCw, Sparkles, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationsPreferencesPanelProps {
  criticalCount: number;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  className?: string;
}

export function NotificationsPreferencesPanel({
  criticalCount,
  onMarkAllRead,
  onRefresh,
  className,
}: NotificationsPreferencesPanelProps) {
  return (
    <aside
      className={cn(
        "hidden w-[260px] shrink-0 flex-col border-l border-gray-100 bg-white py-4 xl:flex",
        className,
      )}
    >
      <div className="mb-4 px-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Preferences
        </h3>
        <div className="space-y-3">
          {[
            { label: "Email notifications", default: true },
            { label: "In-app alerts", default: true },
            { label: "Push notifications", default: false },
            { label: "Weekly digest", default: true },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">{pref.label}</span>
              <Switch defaultChecked={pref.default} className="scale-75" />
            </div>
          ))}
        </div>
      </div>

      <Separator className="mx-4 my-2" />

      <div className="mb-4 px-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Quick Actions
        </h3>
        <div className="space-y-1">
          {[
            { icon: CheckCheck, label: "Mark all as read", action: onMarkAllRead },
            {
              icon: Archive,
              label: "Archive all read",
              action: () => toast.info("Archive coming soon"),
            },
            {
              icon: VolumeX,
              label: "Mute for 1 hour",
              action: () => toast.info("Muted for 1 hour"),
            },
            { icon: RefreshCw, label: "Refresh feed", action: onRefresh },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900"
            >
              <Icon size={13} className="text-gray-400" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="mx-4 my-2" />

      <div className="px-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
            border: "1px solid #C7D2FE",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500" />
            <span className="text-xs font-bold text-indigo-700">AI Summary</span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-indigo-700">
            You have {criticalCount} urgent item{criticalCount !== 1 ? "s" : ""} requiring
            attention today. Your interview prep score is 72% — practice 1 more mock to boost
            it.
          </p>
          <Button
            size="sm"
            className="h-7 w-full cursor-pointer rounded-lg text-xs font-semibold"
            style={{ background: "#4F46E5", color: "white" }}
            onClick={() => toast.info("AI catch-up coming soon")}
          >
            <Sparkles size={11} className="mr-1" />
            Ask AI to Catch Up
          </Button>
        </div>
      </div>
    </aside>
  );
}
