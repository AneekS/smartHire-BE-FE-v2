"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Building2,
  Clock,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrackerApplication } from "@/lib/api-client";
import {
  ApplicationStatusBadge,
  HealthScoreIndicator,
  InterviewProbabilityBadge,
} from "./ApplicationStatus";

interface ApplicationCardProps {
  application: TrackerApplication;
  onSelect: (id: string) => void;
  onWithdraw?: (id: string) => void;
  index?: number;
}

export function ApplicationCard({
  application,
  onSelect,
  onWithdraw,
  index = 0,
}: ApplicationCardProps) {
  const { job, status, applicationHealthScore, interviewProbability, createdAt } =
    application;
  const isTerminal = ["REJECTED", "WITHDRAWN", "HIRED"].includes(status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={cn(
          "group relative p-4 hover:shadow-md transition-all cursor-pointer border border-slate-200 dark:border-slate-800",
          isTerminal && "opacity-75"
        )}
        onClick={() => onSelect(application.id)}
      >
        <div className="flex items-start gap-4">
          {/* Company Logo Placeholder */}
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary/60" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {job.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {job.company.name}
                  {job.company.industry && (
                    <span className="text-slate-400"> · {job.company.industry}</span>
                  )}
                </p>
              </div>
              <HealthScoreIndicator score={applicationHealthScore} />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <ApplicationStatusBadge status={status} size="sm" />
              <InterviewProbabilityBadge probability={interviewProbability} />
              {job.location && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="w-3 h-3" />
                  {job.location}
                </span>
              )}
              {job.workMode && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {job.workMode}
                </Badge>
              )}
            </div>

            {/* Skills */}
            {job.requiredSkills.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {job.requiredSkills.slice(0, 4).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 bg-slate-50 dark:bg-slate-800"
                  >
                    {skill}
                  </Badge>
                ))}
                {job.requiredSkills.length > 4 && (
                  <span className="text-[10px] text-slate-400">
                    +{job.requiredSkills.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3" />
                Applied {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>

              <div className="flex items-center gap-2">
                {!isTerminal && onWithdraw && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWithdraw(application.id);
                    }}
                  >
                    <LogOut className="w-3 h-3 mr-1" />
                    Withdraw
                  </Button>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
