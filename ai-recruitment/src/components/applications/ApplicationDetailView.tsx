"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  MapPin,
  ExternalLink,
  MessageSquarePlus,
  LogOut,
  Clock,
  Activity,
  FileText,
  Target,
  Send,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useApplicationDetail } from "@/hooks/useApplicationTracker";
import {
  ApplicationStatusBadge,
  ApplicationPipeline,
  HealthScoreIndicator,
  InterviewProbabilityBadge,
} from "./ApplicationStatus";
import { ApplicationTimeline } from "./ApplicationTimeline";

interface ApplicationDetailViewProps {
  applicationId: string;
  onBack: () => void;
}

export function ApplicationDetailView({
  applicationId,
  onBack,
}: ApplicationDetailViewProps) {
  const { application, isLoading, addNote, withdraw } =
    useApplicationDetail(applicationId);
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      await addNote(noteContent.trim());
      setNoteContent("");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await withdraw();
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Application not found.</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const isTerminal = ["REJECTED", "WITHDRAWN", "HIRED"].includes(
    application.status
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      {/* Job Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-primary/60" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {application.job.title}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {application.job.company.name}
              {application.job.company.industry && (
                <span> · {application.job.company.industry}</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {application.job.location && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" /> {application.job.location}
                </span>
              )}
              {application.job.workMode && (
                <Badge variant="outline" className="text-[10px]">
                  {application.job.workMode}
                </Badge>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                Applied{" "}
                {formatDistanceToNow(new Date(application.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ApplicationStatusBadge status={application.status} size="lg" />
            {!isTerminal && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-red-500"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                <LogOut className="w-3 h-3 mr-1" />
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div className="mt-6">
          <ApplicationPipeline currentStatus={application.status} />
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
            <HealthScoreIndicator
              score={application.applicationHealthScore}
              size="lg"
            />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2">
              Health Score
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-primary">
              {application.interviewProbability ?? 0}%
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
              Interview Probability
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-emerald-600">
              {application.readinessScore ?? 0}%
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">
              Readiness Score
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="timeline" className="text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs gap-1.5">
            <Target className="w-3.5 h-3.5" /> Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card className="p-4">
            <ApplicationTimeline events={application.timeline ?? []} />
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="p-4">
            {application.recruiterActivities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No recruiter activity yet. Keep checking back!
              </p>
            ) : (
              <div className="space-y-3">
                {application.recruiterActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {act.activityType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {format(new Date(act.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(act.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card className="p-4">
            {/* Add Note */}
            <div className="flex gap-2 mb-4">
              <Textarea
                placeholder="Add a note about this application..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                maxLength={5000}
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim() || isSubmittingNote}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Note list */}
            {application.notes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No notes yet. Add your first note above.
              </p>
            ) : (
              <div className="space-y-3">
                {application.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")} ·{" "}
                      {note.authorRole}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <Card className="p-4">
            {application.assessments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No assessments assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {application.assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {assessment.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {assessment.type}
                        {assessment.deadline && (
                          <> · Due {format(new Date(assessment.deadline), "MMM d, yyyy")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {assessment.score !== null && (
                        <span className="text-sm font-bold text-primary">
                          {assessment.score}/{assessment.maxScore}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          assessment.status === "COMPLETED" && "bg-emerald-50 text-emerald-600",
                          assessment.status === "PENDING" && "bg-amber-50 text-amber-600",
                          assessment.status === "EXPIRED" && "bg-red-50 text-red-500"
                        )}
                      >
                        {assessment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offer Section */}
      {application.offer && (
        <Card className="p-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            🎉 Offer Details
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            {application.offer.salary && (
              <div>
                <p className="text-xs text-slate-500">Salary</p>
                <p className="font-bold text-lg">
                  {application.offer.currency ?? "$"}
                  {application.offer.salary.toLocaleString()}
                </p>
              </div>
            )}
            {application.offer.startDate && (
              <div>
                <p className="text-xs text-slate-500">Start Date</p>
                <p className="font-semibold">
                  {format(new Date(application.offer.startDate), "MMM d, yyyy")}
                </p>
              </div>
            )}
            {application.offer.benefits.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Benefits</p>
                <div className="flex flex-wrap gap-1">
                  {application.offer.benefits.map((b) => (
                    <Badge key={b} variant="outline" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Interview Section */}
      {application.interview && (
        <Card className="p-6 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <h3 className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
            📅 Interview
          </h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-slate-500">Scheduled</p>
              <p className="font-semibold">
                {format(
                  new Date(application.interview.scheduledAt),
                  "MMM d, yyyy · h:mm a"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Type</p>
              <p className="font-semibold">
                {application.interview.type.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge
                variant="outline"
                className={cn(
                  application.interview.status === "COMPLETED" &&
                    "bg-emerald-50 text-emerald-600",
                  application.interview.status === "SCHEDULED" &&
                    "bg-blue-50 text-blue-600",
                  application.interview.status === "CANCELLED" &&
                    "bg-red-50 text-red-500"
                )}
              >
                {application.interview.status}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
