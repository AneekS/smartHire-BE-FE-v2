"use client";

import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApplicationReminders } from "@/hooks/useApplicationTracker";

const REMINDER_ICONS: Record<string, React.ElementType> = {
  INTERVIEW_TOMORROW: Calendar,
  INTERVIEW_UPCOMING: Calendar,
  ASSESSMENT_DUE_SOON: AlertTriangle,
  ASSESSMENT_UPCOMING: Clock,
  FOLLOW_UP: MessageSquare,
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  medium: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  low: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
};

export function SmartReminders() {
  const { reminders, isLoading } = useApplicationReminders();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No reminders right now. You&apos;re all caught up!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.slice(0, 8).map((reminder, i) => {
        const Icon = REMINDER_ICONS[reminder.type] ?? Bell;
        const priorityStyle = PRIORITY_STYLES[reminder.priority] ?? PRIORITY_STYLES.low;

        return (
          <motion.div
            key={`${reminder.type}-${reminder.applicationId}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                "p-3 border-l-4 flex items-start gap-3",
                priorityStyle
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {reminder.message}
                </p>
                {reminder.dueDate && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(reminder.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <Badge
                className={cn(
                  "flex-shrink-0 text-[9px] uppercase tracking-wider",
                  reminder.priority === "high" && "bg-red-100 text-red-600",
                  reminder.priority === "medium" && "bg-amber-100 text-amber-600",
                  reminder.priority === "low" && "bg-blue-100 text-blue-600"
                )}
              >
                {reminder.priority}
              </Badge>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
