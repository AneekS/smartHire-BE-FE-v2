"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Notification } from "@/data/notifications.mock";
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from "./notification-config";
import { useReducedMotion } from "./useReducedMotion";

interface NotificationDrawerProps {
  notification: Notification | null;
  open: boolean;
  onClose: (open: boolean) => void;
}

export function NotificationDrawer({
  notification,
  open,
  onClose,
}: NotificationDrawerProps) {
  const reducedMotion = useReducedMotion();

  if (!notification) return null;

  const cat = CATEGORY_CONFIG[notification.category];
  const pri = PRIORITY_CONFIG[notification.priority];
  const CatIcon = cat.icon;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b px-6 pb-4 pt-6">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: cat.bg }}
            >
              <CatIcon size={20} style={{ color: cat.color }} />
            </div>
            <div>
              <Badge
                className="mb-1 rounded-full text-xs font-bold"
                style={{
                  background: pri.bg,
                  color: pri.color,
                  border: `1px solid ${pri.border}`,
                }}
              >
                {pri.label} Priority
              </Badge>
              <div className="font-mono text-xs text-gray-400">
                {format(new Date(notification.timestamp), "MMM d, yyyy · h:mm a")}
              </div>
            </div>
          </div>
          <SheetTitle className="text-lg font-bold leading-snug text-gray-900">
            {notification.title}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            {notification.description}
          </p>

          {notification.meta && (
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Details
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(notification.meta).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-0.5 text-xs capitalize text-gray-400">
                      {key.replace(/([A-Z])/g, " $1")}
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notification.aiReason && (
            <motion.div
              className="mb-4 rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
                border: "1px solid #C7D2FE",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                  Why you got this
                </span>
              </div>
              <p className="text-sm leading-relaxed text-indigo-800">
                {notification.aiReason}
              </p>
            </motion.div>
          )}

          {notification.aiRecommendation && (
            <motion.div
              className="mb-5 rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
                border: "1px solid #BBF7D0",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Zap size={14} className="text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Recommended action
                </span>
              </div>
              <p className="text-sm leading-relaxed text-emerald-800">
                {notification.aiRecommendation}
              </p>
            </motion.div>
          )}

          {notification.relevanceScore !== undefined && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
              <span className="text-sm font-medium text-gray-500">Relevance Score</span>
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
                    }}
                    initial={{ width: reducedMotion ? `${notification.relevanceScore}%` : 0 }}
                    animate={{ width: `${notification.relevanceScore}%` }}
                    transition={{ duration: reducedMotion ? 0 : 0.8, ease: "easeOut" }}
                  />
                </div>
                <span className="font-mono text-sm font-bold text-indigo-600">
                  {notification.relevanceScore}%
                </span>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-3 border-t bg-gray-50/50 px-6 py-4">
          {notification.actionLabel && (
            <Button
              className="flex-1 cursor-pointer rounded-xl font-semibold"
              style={{ background: cat.color }}
            >
              {notification.actionLabel}
            </Button>
          )}
          {notification.secondaryAction && (
            <Button variant="outline" className="flex-1 cursor-pointer rounded-xl font-semibold">
              {notification.secondaryAction}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
