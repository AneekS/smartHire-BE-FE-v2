"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Bell,
  BarChart3,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplicationTracker";
import type { TrackerApplicationStatus } from "@/lib/api-client";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import { ApplicationDetailView } from "@/components/applications/ApplicationDetailView";
import { ApplicationAnalyticsDashboard } from "@/components/applications/ApplicationAnalytics";
import { SmartReminders } from "@/components/applications/SmartReminders";

const STATUS_FILTERS: Array<{
  value: TrackerApplicationStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All Applications" },
  { value: "APPLIED", label: "Applied" },
  { value: "RESUME_VIEWED", label: "Resume Viewed" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview Scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "OFFER", label: "Offer" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export default function ApplicationTrackerPage() {
  const [statusFilter, setStatusFilter] = useState<
    TrackerApplicationStatus | "ALL"
  >("ALL");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "reminders">(
    "pipeline"
  );

  const filterParam =
    statusFilter === "ALL" ? undefined : statusFilter;
  const {
    applications,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    withdraw,
  } = useApplications(filterParam ? { status: filterParam } : undefined);

  // If a detail view is open, show it
  if (selectedAppId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ApplicationDetailView
          applicationId={selectedAppId}
          onBack={() => setSelectedAppId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Application Tracker
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track your job applications, monitor recruiter activity, and get AI-powered insights.
        </p>
      </motion.div>

      {/* Analytics Dashboard */}
      <ApplicationAnalyticsDashboard />

      {/* Tab Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === "pipeline" ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setActiveTab("pipeline")}
        >
          <LayoutGrid className="w-4 h-4" /> Pipeline
        </Button>
        <Button
          variant={activeTab === "reminders" ? "default" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setActiveTab("reminders")}
        >
          <Bell className="w-4 h-4" /> Reminders
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "reminders" ? (
          <motion.div
            key="reminders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <SmartReminders />
          </motion.div>
        ) : (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as TrackerApplicationStatus | "ALL")
                }
              >
                <SelectTrigger className="w-56 h-9 text-sm">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-xs">
                {applications.length} application{applications.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Application List */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16">
                <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  No applications found
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Start applying to jobs to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app, i) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onSelect={setSelectedAppId}
                    onWithdraw={withdraw}
                    index={i}
                  />
                ))}

                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
