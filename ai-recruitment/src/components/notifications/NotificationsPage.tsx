"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Settings,
  AlertTriangle,
  Calendar,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  MOCK_NOTIFICATIONS,
  type Notification,
  type Category,
  type Priority,
} from "@/data/notifications.mock";
import { CATEGORY_CONFIG, PRIORITY_ORDER } from "./notification-config";
import { SummaryCard } from "./SummaryCard";
import { PriorityGroupHeader } from "./PriorityGroupHeader";
import { NotificationCard } from "./NotificationCard";
import { NotificationDrawer } from "./NotificationDrawer";
import { NotificationsEmptyState } from "./NotificationsEmptyState";
import { NotificationsSidebar } from "./NotificationsSidebar";
import { NotificationsPreferencesPanel } from "./NotificationsPreferencesPanel";
import { useReducedMotion } from "./useReducedMotion";

export function NotificationsPage() {
  const reducedMotion = useReducedMotion();
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<"all" | Category>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const visible = useMemo(
    () => notifications.filter((n) => !n.isSnoozed),
    [notifications],
  );

  const unreadCount = visible.filter((n) => !n.isRead).length;
  const criticalCount = visible.filter(
    (n) => n.priority === "critical" && !n.isRead,
  ).length;
  const interviewCount = visible.filter(
    (n) => n.category === "interviews" && !n.isRead,
  ).length;
  const jobAlertCount = visible.filter((n) => n.category === "job_alerts").length;

  const tabCounts: Record<string, number> = useMemo(
    () => ({
      all: visible.filter((n) => !n.isRead).length,
      ...Object.fromEntries(
        Object.keys(CATEGORY_CONFIG).map((cat) => [
          cat,
          visible.filter((n) => n.category === cat && !n.isRead).length,
        ]),
      ),
    }),
    [visible],
  );

  const filtered = useMemo(() => {
    return visible
      .filter((n) => activeCategory === "all" || n.category === activeCategory)
      .filter((n) => !unreadOnly || !n.isRead)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const pOrder: Record<Priority, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        if (pOrder[a.priority] !== pOrder[b.priority]) {
          return pOrder[a.priority] - pOrder[b.priority];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [visible, activeCategory, unreadOnly]);

  const grouped = useMemo(() => {
    const groups: Record<Priority, Notification[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };
    filtered.forEach((n) => groups[n.priority].push(n));
    return groups;
  }, [filtered]);

  const handleMarkRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

  const handleMarkAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const handleDelete = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const handlePin = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
    );

  const handleSnooze = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isSnoozed: true } : n)),
    );

  const handleCardClick = (n: Notification) => {
    setSelectedNotification(n);
    setDrawerOpen(true);
    if (!n.isRead) handleMarkRead(n.id);
  };

  const handleRefresh = () => {
    setNotifications(MOCK_NOTIFICATIONS);
    toast.success("Feed refreshed");
  };

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100dvh)] flex-col overflow-hidden bg-[#F8F9FD]">
        {/* Sticky header */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 border-b border-gray-100 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                {unreadCount > 0 ? (
                  <motion.div
                    animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className={reducedMotion ? undefined : "bell-pulse"}
                  >
                    <Bell size={18} className="text-indigo-600" fill="currentColor" />
                  </motion.div>
                ) : (
                  <Bell size={18} className="text-indigo-600" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {unreadCount} unread · {criticalCount} urgent
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 text-sm text-gray-500 sm:flex">
                <span className="text-xs font-medium">Unread only</span>
                <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkAllRead}
                    className="h-8 w-8 cursor-pointer rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Mark all as read"
                  >
                    <CheckCheck size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>

              <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 xl:hidden"
                    aria-label="Preferences"
                  >
                    <SlidersHorizontal size={16} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle>Preferences</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <NotificationsPreferencesPanel
                      criticalCount={criticalCount}
                      onMarkAllRead={() => {
                        handleMarkAllRead();
                        setPrefsOpen(false);
                      }}
                      onRefresh={handleRefresh}
                      className="!flex !w-full !border-0"
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toast.info("Notification settings coming soon")}
                    className="hidden h-8 w-8 cursor-pointer rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:flex"
                    aria-label="Notification settings"
                  >
                    <Settings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notification settings</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Mobile category chips */}
          <ScrollArea className="mt-3 w-full lg:hidden">
            <div className="flex gap-2 pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                All {tabCounts.all > 0 && `(${tabCounts.all})`}
              </button>
              {(Object.entries(CATEGORY_CONFIG) as [Category, (typeof CATEGORY_CONFIG)[Category]][]).map(
                ([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      activeCategory === key ? "text-white" : "bg-gray-100 text-gray-600"
                    }`}
                    style={
                      activeCategory === key ? { background: cfg.color } : undefined
                    }
                  >
                    {cfg.label}
                    {(tabCounts[key] || 0) > 0 && ` (${tabCounts[key]})`}
                  </button>
                ),
              )}
            </div>
          </ScrollArea>

          <div className="mt-3 flex items-center gap-2 sm:hidden">
            <span className="text-xs font-medium text-gray-500">Unread only</span>
            <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          </div>
        </motion.div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <NotificationsSidebar
            activeCategory={activeCategory}
            tabCounts={tabCounts}
            onCategoryChange={setActiveCategory}
          />

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.15 }}
              className="flex gap-3 overflow-x-auto border-b border-gray-100 bg-white px-4 py-4 sm:px-6"
            >
              <SummaryCard label="Unread" value={unreadCount} icon={Bell} color="#6366F1" />
              <SummaryCard
                label="Urgent Today"
                value={criticalCount}
                icon={AlertTriangle}
                color="#EF4444"
              />
              <SummaryCard
                label="Interview Updates"
                value={interviewCount}
                icon={Calendar}
                color="#F97316"
              />
              <SummaryCard
                label="Job Alerts"
                value={jobAlertCount}
                icon={Zap}
                color="#10B981"
              />
            </motion.div>

            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
                {filtered.length === 0 ? (
                  <NotificationsEmptyState category={activeCategory} />
                ) : (
                  <AnimatePresence mode="popLayout">
                    {PRIORITY_ORDER.filter((p) => grouped[p].length > 0).map(
                      (priority, groupIndex) => (
                        <motion.div
                          key={priority}
                          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: reducedMotion ? 0 : groupIndex * 0.05 }}
                          className="mb-6"
                        >
                          <PriorityGroupHeader
                            priority={priority}
                            count={grouped[priority].length}
                          />
                          <div className="space-y-2">
                            <AnimatePresence>
                              {grouped[priority].map((notification) => (
                                <NotificationCard
                                  key={notification.id}
                                  notification={notification}
                                  onClick={handleCardClick}
                                  onMarkRead={handleMarkRead}
                                  onSnooze={handleSnooze}
                                  onPin={handlePin}
                                  onDelete={handleDelete}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ),
                    )}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </main>

          <NotificationsPreferencesPanel
            criticalCount={criticalCount}
            onMarkAllRead={handleMarkAllRead}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      <NotificationDrawer
        notification={selectedNotification}
        open={drawerOpen}
        onClose={setDrawerOpen}
      />
    </TooltipProvider>
  );
}
