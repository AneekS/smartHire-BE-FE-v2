"use client";

import { motion } from "framer-motion";
import {
  Briefcase,
  Eye,
  UserCheck,
  Calendar,
  Gift,
  Trophy,
  XCircle,
  LogOut,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApplicationAnalytics } from "@/hooks/useApplicationTracker";

const STAT_CARDS = [
  {
    key: "applicationsSent" as const,
    label: "Applied",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "resumeViewed" as const,
    label: "Resume Viewed",
    icon: Eye,
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  {
    key: "shortlistedCount" as const,
    label: "Shortlisted",
    icon: UserCheck,
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  {
    key: "interviewCount" as const,
    label: "Interviews",
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    key: "offerCount" as const,
    label: "Offers",
    icon: Gift,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    key: "hiredCount" as const,
    label: "Hired",
    icon: Trophy,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
];

export function ApplicationAnalyticsDashboard() {
  const { analytics, isLoading } = useApplicationAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    bg
                  )}
                >
                  <Icon className={cn("w-4 h-4", color)} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {analytics[key]}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-extrabold">{analytics.totalActive}</p>
            <p className="text-xs text-slate-500">Active Applications</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-extrabold">
              {Math.round(analytics.avgHealthScore)}
            </p>
            <p className="text-xs text-slate-500">Avg Health Score</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-lg font-extrabold">
              {analytics.rejectedCount + analytics.withdrawnCount}
            </p>
            <p className="text-xs text-slate-500">Rejected / Withdrawn</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
