"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "./useReducedMotion";

interface NotificationsEmptyStateProps {
  category: string;
}

export function NotificationsEmptyState({ category }: NotificationsEmptyStateProps) {
  const reducedMotion = useReducedMotion();
  const label = category === "all" ? "" : ` ${category.replace(/_/g, " ")}`;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center px-8 py-20 text-center"
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50"
      >
        <Bell className="h-8 w-8 text-indigo-500" />
      </motion.div>
      <h3 className="mb-2 text-lg font-bold text-gray-800">You&apos;re all caught up!</h3>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-500">
        No{label} notifications right now. We&apos;ll ping you the moment something
        important happens.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {["Check Job Alerts", "View Applications", "Set Reminders"].map((action) => (
          <Button
            key={action}
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-full border-gray-200 text-xs font-medium hover:border-indigo-300 hover:text-indigo-600"
          >
            {action}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
