"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusConfig } from "./ApplicationStatus";
import type { TrackerApplicationStatus } from "@/lib/api-client";

interface TimelineEvent {
  id: string;
  status: TrackerApplicationStatus;
  updatedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function ApplicationTimeline({
  events,
  className,
}: {
  events: TimelineEvent[];
  className?: string;
}) {
  if (!events.length) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No timeline events yet.
      </p>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

      <div className="space-y-0">
        {events.map((event, i) => {
          const config = getStatusConfig(event.status);
          const Icon = config.icon;
          const isLast = i === events.length - 1;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex items-start gap-4 py-3"
            >
              {/* Node */}
              <div
                className={cn(
                  "relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  isLast ? config.bgColor : "bg-emerald-50 dark:bg-emerald-950/30"
                )}
              >
                {isLast ? (
                  <Icon className={cn("w-4 h-4", config.color)} />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={cn(
                    "font-semibold text-sm",
                    isLast ? config.color : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {config.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {format(new Date(event.createdAt), "MMM d, yyyy · h:mm a")}
                  {" · "}
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                  })}
                </p>
                {event.updatedBy && event.updatedBy !== "SYSTEM" && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    by {event.updatedBy}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
