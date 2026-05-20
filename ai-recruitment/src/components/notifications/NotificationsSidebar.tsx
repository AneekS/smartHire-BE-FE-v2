"use client";

import { Inbox, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Category } from "@/data/notifications.mock";
import { CATEGORY_CONFIG } from "./notification-config";

interface NotificationsSidebarProps {
  activeCategory: "all" | Category;
  tabCounts: Record<string, number>;
  onCategoryChange: (category: "all" | Category) => void;
}

export function NotificationsSidebar({
  activeCategory,
  tabCounts,
  onCategoryChange,
}: NotificationsSidebarProps) {
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-gray-100 bg-white py-4 lg:flex">
      <div className="mb-2 px-3">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "border border-indigo-100 bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Inbox size={15} />
            <span>All</span>
          </div>
          {tabCounts.all > 0 && (
            <Badge className="h-5 rounded-full border-0 bg-indigo-100 px-1.5 font-mono text-xs font-bold text-indigo-700">
              {tabCounts.all}
            </Badge>
          )}
        </button>
      </div>

      <Separator className="mx-3 my-2" />

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-0.5">
          {(Object.entries(CATEGORY_CONFIG) as [Category, (typeof CATEGORY_CONFIG)[Category]][]).map(
            ([key, cfg]) => {
              const Icon = cfg.icon;
              const count = tabCounts[key] || 0;
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onCategoryChange(key)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive ? "text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={isActive ? { background: cfg.color } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <span>{cfg.label}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            },
          )}
        </div>
      </ScrollArea>

      <div className="mt-2 border-t border-gray-100 px-3 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <VolumeX size={13} />
            <span>Do Not Disturb</span>
          </div>
          <Switch className="scale-75" />
        </div>
      </div>
    </aside>
  );
}
