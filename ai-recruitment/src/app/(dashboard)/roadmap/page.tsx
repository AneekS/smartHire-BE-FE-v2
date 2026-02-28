"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Target,
  Plus,
  BookOpen,
  Zap,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCareer } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_TARGET = "Software Engineer";

export default function RoadmapPage() {
  const [targetRole, setTargetRole] = useState(DEFAULT_TARGET);
  const [inputRole, setInputRole] = useState("");
  const { milestones, isLoading, refresh } = useCareer(targetRole);

  const handleSetTarget = () => {
    if (inputRole.trim()) {
      setTargetRole(inputRole.trim());
      setInputRole("");
    }
  };

  const displayMilestones =
    milestones.length > 0
      ? milestones
      : [
          { id: "1", title: "Complete System Design fundamentals", description: "Design scalable systems", completed: false },
          { id: "2", title: "2+ mock interviews (Technical)", description: "Practice with AI interviewer", completed: false },
          { id: "3", title: "Resume ATS score 85+", description: "Optimize resume for target roles", completed: false },
          { id: "4", title: "Apply to 20 target companies", description: "Tier-1 startups & FAANG", completed: false },
        ];

  const completedCount = displayMilestones.filter((m) => m.completed).length;
  const progress =
    displayMilestones.length > 0
      ? Math.round((completedCount / displayMilestones.length) * 100)
      : 0;

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-900 to-indigo-900 p-8 text-white shadow-2xl dark:border-slate-800"
        >
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-3 bg-white/10 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                Career Path
              </Badge>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Your Career Roadmap
              </h1>
              <p className="mt-2 max-w-lg text-sm text-blue-100/80">
                AI-generated career path for <strong>{targetRole}</strong>. Track milestones
                and skill goals.
              </p>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="e.g. Frontend Engineer, Data Scientist"
                  className="max-w-xs rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetTarget()}
                />
                <Button
                  size="sm"
                  className="rounded-xl bg-white text-slate-900 hover:bg-slate-100"
                  onClick={handleSetTarget}
                  disabled={!inputRole.trim()}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Update Path
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-extrabold">{progress}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/80">
                  Progress
                </p>
              </div>
              <div className="h-12 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Milestones for {targetRole}
            </h2>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-4">
                {displayMilestones.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "rounded-2xl border-slate-200/60 p-5 transition-all dark:border-slate-800",
                        m.completed && "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 shrink-0 text-slate-400">
                          {m.completed ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                          ) : (
                            <Circle className="h-6 w-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={cn(
                              "font-bold text-slate-900 dark:text-white",
                              m.completed && "line-through text-slate-500"
                            )}
                          >
                            {m.title}
                          </h3>
                          {m.description && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="rounded-3xl border-slate-200/60 p-6 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Career Path AI
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Stages generated for your target role
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Enter a target role above to get a personalized career roadmap.
              </p>
            </Card>

            <Card className="rounded-3xl border-slate-200/60 p-6 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-4">
                Quick links
              </h4>
              <div className="space-y-2">
                <a
                  href="/resume"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Resume Optimizer
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
                <a
                  href="/interviews"
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Mock Interview
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
