"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Check, Clock, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Notification } from "@/data/notifications.mock";
import { CATEGORY_CONFIG } from "./notification-config";
import { useReducedMotion } from "./useReducedMotion";

interface NotificationCardProps {
  notification: Notification;
  onClick: (n: Notification) => void;
  onMarkRead: (id: string) => void;
  onSnooze: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({
  notification,
  onClick,
  onMarkRead,
  onSnooze,
  onPin,
  onDelete,
}: NotificationCardProps) {
  const cat = CATEGORY_CONFIG[notification.category];
  const CatIcon = cat.icon;
  const reducedMotion = useReducedMotion();
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), {
    addSuffix: true,
  });

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, x: -12 }}
      animate={{
        opacity: notification.isRead ? 0.7 : 1,
        x: 0,
      }}
      exit={reducedMotion ? undefined : { opacity: 0, x: 12, height: 0 }}
      whileHover={reducedMotion ? undefined : { x: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`group relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all duration-150 ${
        notification.isRead
          ? "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
          : "border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md"
      }`}
      style={
        !notification.isRead
          ? { borderLeft: `3px solid ${cat.color}` }
          : undefined
      }
      onClick={() => onClick(notification)}
    >
      {notification.isPinned && (
        <div className="absolute right-8 top-2 text-amber-400">
          <Pin size={12} fill="currentColor" />
        </div>
      )}

      {!notification.isRead && (
        <motion.div
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-4 h-2 w-2 rounded-full bg-indigo-500"
        />
      )}

      <div className="mt-0.5 shrink-0">
        <Avatar className="h-9 w-9 rounded-xl">
          <AvatarFallback
            className="rounded-xl text-xs font-bold"
            style={{ background: cat.bg, color: cat.color }}
          >
            <CatIcon size={16} />
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <h4
          className={`mb-1 text-sm font-semibold leading-snug ${
            notification.isRead ? "text-gray-600" : "text-gray-900"
          }`}
        >
          {notification.title}
        </h4>

        <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
          {notification.description}
        </p>

        {notification.meta && Object.keys(notification.meta).length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {Object.entries(notification.meta)
              .slice(0, 3)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: cat.bg, color: cat.color }}
                >
                  {value}
                </span>
              ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          {notification.actionLabel && (
            <Button
              size="sm"
              className="h-6 cursor-pointer rounded-full px-3 text-xs font-semibold"
              style={{ background: cat.color, color: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              {notification.actionLabel}
            </Button>
          )}
          {notification.secondaryAction && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 cursor-pointer rounded-full px-3 text-xs font-medium text-gray-500 hover:text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {notification.secondaryAction}
            </Button>
          )}
          <span className="ml-auto font-mono text-xs text-gray-400">{timeAgo}</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 hidden items-center gap-1 group-hover:flex">
        {[
          { icon: Check, label: "Mark read", action: () => onMarkRead(notification.id) },
          { icon: Clock, label: "Snooze", action: () => onSnooze(notification.id) },
          { icon: Pin, label: "Pin", action: () => onPin(notification.id) },
          {
            icon: Trash2,
            label: "Delete",
            action: () => onDelete(notification.id),
          },
        ].map(({ icon: Icon, label, action }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  action();
                }}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-all duration-100 hover:bg-gray-100 hover:text-gray-700"
                aria-label={label}
              >
                <Icon size={12} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </motion.div>
  );
}
