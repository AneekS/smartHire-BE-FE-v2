"use client";

import { Badge } from "@/components/ui/badge";
import { PRIORITY_CONFIG } from "./notification-config";
import type { Priority } from "@/data/notifications.mock";

interface PriorityGroupHeaderProps {
  priority: Priority;
  count: number;
}

export function PriorityGroupHeader({ priority, count }: PriorityGroupHeaderProps) {
  const cfg = PRIORITY_CONFIG[priority];

  return (
    <div className="mb-2 flex items-center gap-2 px-1 py-2">
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: cfg.dot }}
      />
      <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
      <Badge
        variant="secondary"
        className="h-5 rounded-full px-2 py-0 font-mono text-xs font-bold"
        style={{
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
        }}
      >
        {count}
      </Badge>
      <div className="ml-1 h-px flex-1 bg-gray-100" />
    </div>
  );
}
